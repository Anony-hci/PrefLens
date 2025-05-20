import gurobipy as gp
from gurobipy import GRB
import io
import sys
import json
import inspect

class OptimizationModel:
    def __init__(self):
        self.model = gp.Model()
        self.variables = {}  # 存储变量
        
    def lhs_to_expr(self, lhs, items):
        if lhs.strip().startswith('lambda'):
            return self.lhs_to_expr_lambda(lhs, items)
        else:
            return self.lhs_to_expr_py(lhs, items)
        
    def lhs_to_expr_py(self, lhs, items):
        if isinstance(lhs, str):
            # 如果 lhs 是字符串，先尝试将其作为变量名查找
            if lhs in self.variables:
                return self.variables[lhs]  # 返回变量对象
        # 如果不是变量名，则尝试评估表达式为 lambda 函数
        try:
            local_scope = {"items": items, "vars": self.variables}
            exec(lhs, globals(), local_scope)  # 执行代码，修改局部作用域
            return local_scope.get('results', None)  # 获取执行结果（例如 total_courses）
        except Exception as e:
            print(f"Error evaluating expression: {e}")
            return None
    
    def lhs_to_expr_lambda(self, lhs, items):
        if isinstance(lhs, str):
            # 如果 lhs 是字符串，先尝试将其作为变量名查找
            if lhs in self.variables:
                return self.variables[lhs]  # 返回变量对象
            
            # 如果不是变量名，则尝试评估表达式为 lambda 函数
            try:
                lambda_func = eval(lhs)
            except Exception as e:
                print(f"Error evaluating expression: {e}")
                return None
            # 检查 lambda 函数的参数
            params = inspect.signature(lambda_func).parameters
            if len(params) == 2:  # If it expects both 'vars' and 'courses'
                expression = lambda_func(self.variables, items)
            elif len(params) == 1:  # If it expects only 'vars'
                expression = lambda_func(self.variables)
            else:
                raise ValueError(f"Unexpected number of parameters in expression: {len(params)}")
        
        return expression

    def set_incremental_optimization_model(self, base_solution, added_variables, items, problem_model):
        self.set_incremental_variables(base_solution, added_variables)
        self.set_incremental_objective(base_solution, problem_model.objectives, items)
        self.set_constraints(problem_model.constraints, items)
        self.set_constraints(problem_model.global_constraints, items)


    def set_optimization_model(self, items, problem_model):
        self.set_variables(items)
        self.set_objective(problem_model.objectives, items)
        self.set_constraints(problem_model.constraints, items)
        self.set_constraints(problem_model.global_constraints, items)
    
    def set_incremental_variables(self, base_solution, added_variables):
        for var_name, value in base_solution.items():
            var = self.model.addVar(name=var_name, lb=0, ub=1, vtype=GRB.BINARY)
            var.Start = value
            self.variables[var_name] = var
        for var_name in added_variables:
            var = self.model.addVar(name=var_name, lb=0, ub=1, vtype=GRB.BINARY)
            self.variables[var_name] = var
        self.model.update()


    
    def set_variables(self, items):
        for item in items:
            var_name = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
            var = self.model.addVar(name=var_name, lb=0, ub=1, vtype=GRB.BINARY)
            self.variables[var_name] = var  # 将变量名作为键，变量对象作为值
        self.model.update()
    
    def set_incremental_objective(self, base_solution, objectives, items):
        """根据 problemModel 中的目标函数添加目标, 支持多目标函数"""
        weighted_obj = gp.LinExpr()  # 初始化一个空的线性表达式
        if objectives:
            for obj in objectives:
                expression = obj['expression']
                weight = obj.get('weight', 1.0)  # 获取目标函数的权重，默认为1.0
                expression = self.lhs_to_expr(expression, items)
                
            
                if isinstance(expression, gp.LinExpr):
                    if obj['maximize']:
                        weighted_obj += weight * expression  # 加权和
                    else:
                        weighted_obj -= weight * expression  # 加权和
                break
        # 定义修改惩罚项
        penalty = gp.quicksum(
            (1 - var) if base_solution.get(var.varName, 0) > 0.5 else var
            for var in self.model.getVars()
            if var.varName in base_solution
        )
        alpha = 5
        self.model.setObjective(weighted_obj- alpha * penalty, GRB.MAXIMIZE)
        self.model.update()

    def set_objective(self, objectives, items):
        """根据 problemModel 中的目标函数添加目标, 支持多目标函数"""
        weighted_obj = gp.LinExpr()  # 初始化一个空的线性表达式
        if objectives:
            for obj in objectives:
                # print(f"------{obj}")
                expression = obj['expression']
                weight = obj.get('weight', 1.0)  # 获取目标函数的权重，默认为1.0
                # print(f"lhs objectives:{expression}")
                expression = self.lhs_to_expr(expression, items)
                # print(f"expr obj: {expression}")
                # print(f"----is: {isinstance(expression, gp.LinExpr)}")
                if obj['maximize']:
                    weighted_obj += weight * expression  # 加权和
                else:
                    weighted_obj -= weight * expression  # 加权和
                    
        self.model.setObjective(weighted_obj, GRB.MAXIMIZE)
        self.model.update()
    def set_constraints(self, constraints, items):
        """根据 problemModel 中的约束添加约束"""
        for constr in constraints:
            lhs = constr['lhs']
            rhs = constr['rhs']
            constraint_type = constr['constraint_type']
            is_hard = constr['is_hard_constraint'] if 'is_hard_constraint' in constr else True
            description = constr['description']
            if (is_hard):
                self.add_hard_constraint(items, lhs, rhs, constraint_type, description)
            else:
                self.add_soft_constraint(items, lhs, rhs, constraint_type, description)


    def add_hard_constraint(self, items, lhs_1, rhs, constraint_type, name=""):
        # print("---\nlhs", lhs)
        lhs = self.lhs_to_expr(lhs_1, items)
        
        """动态添加约束"""
        try:
            # 使用 Gurobi 的比较操作符添加约束
            if constraint_type == '<=':
                constr = self.model.addConstr(lhs <= rhs, name=name)
            elif constraint_type == '>=':
                constr = self.model.addConstr(lhs >= rhs, name=name)
            elif constraint_type == '<':
                constr = self.model.addConstr(lhs <= rhs, name=name)
                constraint_type == '<='
            elif constraint_type == '>':
                constr = self.model.addConstr(lhs >= rhs, name=name)
                constraint_type == '>='
            elif constraint_type == '==' or '=':
                constr = self.model.addConstr(lhs == rhs, name=name)
            elif constraint_type == '!=':
                constr = self.model.addConstr(lhs != rhs, name=name)
            
            self.model.update()
            return (f"{self.lin_expr_to_str(lhs)} {constraint_type} {rhs}")
        except gp.GurobiError as e:
            # 捕获并记录 Gurobi 相关的错误
            print(f"错误: 添加约束时发生 Gurobi 异常: {lhs}")
            return None
        except Exception as e:
            print(f"错误: 添加约束时发生异常: {lhs}")
            return None

    def add_soft_constraint(self, items, lhs, rhs, constraint_type, name="", penalty_weight=1.0):
        """动态添加软约束，并将其作为目标函数的惩罚项"""
        lhs = self.lhs_to_expr(lhs, items)
        if constraint_type == '<=':
            # 添加松弛变量
            slack_var = self.model.addVar(name=f"slack_{name}", lb=0, vtype=GRB.CONTINUOUS)
            # 修改约束
            self.model.addConstr(lhs <= rhs + slack_var, name=name)
            # 将惩罚项从目标函数中减去
            self.model.setObjective(self.model.getObjective() - penalty_weight * slack_var, GRB.MAXIMIZE)
        
        elif constraint_type == '>=':
            slack_var = self.model.addVar(name=f"slack_{name}", lb=0, vtype=GRB.CONTINUOUS)
            self.model.addConstr(lhs >= rhs - slack_var, name=name)
            self.model.setObjective(self.model.getObjective() - penalty_weight * slack_var, GRB.MAXIMIZE)
        
        elif constraint_type == '==' or '=':
            # 添加两个松弛变量
            slack_var_upper = self.model.addVar(name=f"slack_upper_{name}", lb=0, vtype=GRB.CONTINUOUS)
            slack_var_lower = self.model.addVar(name=f"slack_lower_{name}", lb=0, vtype=GRB.CONTINUOUS)
            # 修改约束
            self.model.addConstr(lhs <= rhs + slack_var_upper, name=f"{name}_upper")
            self.model.addConstr(lhs >= rhs - slack_var_lower, name=f"{name}_lower")
            # 将惩罚项从目标函数中减去
            self.model.setObjective(self.model.getObjective() - penalty_weight*slack_var_lower - slack_var_lower*slack_var_upper, GRB.MAXIMIZE)
        
        self.model.update()

    def remove_constraint(self, name):
        """动态删除约束"""
        # 需要更复杂的逻辑来查找并移除软约束中的相关变量
        # 这里仅删除硬约束
        for constr in self.model.getConstrs():
            if constr.ConstrName == name:
                self.model.removeConstr(constr)
        self.model.update()
    
    def lin_expr_to_str(self, lhs_expr):
        if isinstance(lhs_expr, gp.Var):
            return lhs_expr.VarName
        expr_parts = []
    
        # 遍历所有项，获取系数和变量
        for i in range(lhs_expr.size()):  # 使用 size() 方法获取线性表达式中的项数
            var = lhs_expr.getVar(i)      # 获取第 i 项的变量
            coeff = lhs_expr.getCoeff(i)  # 获取第 i 项的系数
            
            var_name = var.getAttr('VarName')  # 获取变量名
            if coeff == 1:
                expr_parts.append(f"{var_name}")
            elif coeff == -1:
                expr_parts.append(f"-{var_name}")
            else:
                expr_parts.append(f"{coeff} * {var_name}")
        
        return " + ".join(expr_parts)

        

    def get_objective_expr(self):
        obj = self.model.getObjective()
        obj_expr = []
        for i in range(obj.size()):
            var = obj.getVar(i)
            coeff = obj.getCoeff(i)
            obj_expr.append(f"{coeff}*{var.VarName}")
        obj_str = " + ".join(obj_expr)
        # print(f"目标函数: {obj_str}")
        return obj_str
    
    

    def print_solution(self, solution):
        outputs = []
        """打印单个解的详细信息"""
        outputs.append(f"\n解 {solution['SolutionNumber']}:")
        
        # 处理变量
        outputs.append(f"  变量取值:")
        
        # 假设课程选择变量以 'course_' 为前缀，请根据您的模型调整前缀
        selected_courses = []
        unselected_courses = []
        
        for var_name, var_value in solution["Variables"].items():
            # 仅处理二进制变量（0 或 1）作为课程选择变量
            if var_value == 1:
                selected_courses.append(var_name)
            elif var_value == 0:
                unselected_courses.append(var_name)
        
        # 转换为更友好的显示格式（去掉前缀）
        selected_courses_str = ", ".join([var.replace('course_', '') for var in selected_courses]) if selected_courses else "无"
        unselected_courses_str = ", ".join([var.replace('course_', '') for var in unselected_courses]) if unselected_courses else "无"
        
        outputs.append(f"    选择的课程包括：{selected_courses_str}")
        outputs.append(f"    没有选择的课程包括：{unselected_courses_str}")
        
        # 打印目标函数值
        if solution['Objective'] is not None:
            outputs.append(f"\n  目标函数值: {solution['Objective']}")
        else:
            outputs.append("\n  目标函数值: 无法获取")
        
        # 打印约束满足情况
        outputs.append("\n  约束满足情况:")
        for constr_name, status in solution["Constraints"].items():
            outputs.append(f"    {constr_name}: {status}")
        return outputs

    def optimize(self, solution_limit=10000):
        """求解模型，返回所有满足约束的解，并将结果存储在变量中"""
        pool_size = 500
        # 设置解决方案池参数
        self.model.setParam('PoolSolutions', pool_size)    # 设置解决方案池的上限
        self.model.setParam('PoolSearchMode', 2)   # 启用多重解搜索
        self.model.setParam('SolutionLimit', 10000)    # 限制最多返回 solution_limit 个解
        self.model.setParam('TimeLimit', 120)
        # 设置整数解的容忍度
        self.model.setParam('IntFeasTol', 1e-9)  # 使用更严格的整数可行性容忍度
        
        # 求解模型
        self.model.optimize()
        
        # 初始化输出
        outputs = {
            "status": None,
            "solutions": [],
            "IIS": []
        }
        print(f"model status: {self.model.status}")
        # 检查模型是否求解成功
        if self.model.status == 10 or self.model.status == GRB.OPTIMAL or self.model.status == GRB.TIME_LIMIT:
            outputs["status"] = "OPTIMAL" if self.model.status == GRB.OPTIMAL else "TIME_LIMIT"
            print(f"model status: optimal")

            # 获取最优目标值（全局最优解的目标值）
            best_obj = self.model.objVal
            
            # 遍历所有找到的解
            solutions = []
            for sol_num in range(self.model.SolCount):
                # 设置当前解编号
                self.model.setParam(GRB.Param.SolutionNumber, sol_num)
                self.model.update()  # 确保参数设置生效

                # 获取当前解的变量值
                solution_vars = {}
                for var in self.model.getVars():
                    val = var.Xn
                    # 对于二元变量，将值四舍五入为0或1
                    if var.VType == GRB.BINARY:
                        solution_vars[var.varName] = round(val)  # 四舍五入到最接近的整数
                    else:
                        solution_vars[var.varName] = val  # 保持其他变量的原始值
                
                # 获取当前解的目标函数值
                try:
                    current_obj = self.model.PoolObjVal
                    # 仅保留目标值等于最优值的解（考虑浮点精度容忍度）
                    tol = self.model.Params.FeasibilityTol  # 使用Gurobi的容忍度参数
                    if abs(current_obj - best_obj) > tol:
                        continue  # 跳过非最优解
                except AttributeError:
                    current_obj = None  # 无法获取目标函数值

                # 检查约束满足情况
                constraints_status = []
                constraint_status = {}
                for constr in self.model.getConstrs():
                    expr = self.model.getRow(constr)  # 获取约束的线性表达式

                    lhs = 0
                    for j in range(expr.size()):
                        var = expr.getVar(j)
                        coeff = expr.getCoeff(j)
                        lhs += coeff * solution_vars[var.varName]

                    sense = constr.Sense
                    rhs = constr.RHS
                    tol = self.model.Params.FeasibilityTol  # 获取容忍度

                    # 根据约束类型判断是否满足
                    if sense == GRB.LESS_EQUAL:
                        satisfied = lhs <= rhs + tol
                    elif sense == GRB.GREATER_EQUAL:
                        satisfied = lhs >= rhs - tol
                    elif sense == GRB.EQUAL:
                        satisfied = abs(lhs - rhs) <= tol
                    else:
                        satisfied = False  # 未知的约束类型

                    status = "满足" if satisfied else "不满足"
                    constraint_status = {
                        'constrName': constr.ConstrName,
                        'lhs': lhs,
                        'rhs': rhs,
                    }
                    constraints_status.append(constraint_status)

                # 构建当前解的完整信息
                complete_solution = {
                    "SolutionNumber": sol_num + 1,
                    "Variables": solution_vars,
                    "Objective": current_obj,
                    "Constraints": constraints_status
                }
                
                # 添加到解列表
                solutions.append(complete_solution)
            
            outputs["solutionNum"] = len(solutions)
            outputs["solutions"] = solutions

        else:
            # 模型不可行时
            outputs["status"] = "INFEASIBLE"
            if self.model.status == GRB.INFEASIBLE:
                # 调用模型的 IIS (Irreducible Inconsistent Subsystem) 功能以找出不可行的约束
                self.model.computeIIS()
                for constr in self.model.getConstrs():
                    if constr.IISConstr:
                        expr = self.model.getRow(constr)
                        lhs_terms = []
                        for j in range(expr.size()):
                            var = expr.getVar(j)
                            coeff = expr.getCoeff(j)
                            term = f"{coeff}*{var.varName}" if coeff != 1 else f"{var.varName}"
                            lhs_terms.append(term)
                        lhs_str = " + ".join(lhs_terms) if lhs_terms else "0"
                        
                        # 获取约束的类型和右侧值
                        sense = constr.Sense
                        rhs = constr.RHS
                        if sense == GRB.LESS_EQUAL:
                            sense_str = "<="
                        elif sense == GRB.GREATER_EQUAL:
                            sense_str = ">="
                        elif sense == GRB.EQUAL:
                            sense_str = "=="
                        else:
                            sense_str = "?"
                        
                        # 完整约束表达式
                        expr_str = f"{lhs_str} {sense_str} {rhs}"
                        outputs["IIS"].append({constr.ConstrName: expr_str})

            elif self.model.status == GRB.UNBOUNDED:
                outputs["status"] = "UNBOUNDED"
            elif self.model.status == GRB.INF_OR_UNBD:
                outputs["status"] = "INF_OR_UNBD"
                self.model.computeIIS()
                if self.model.IISMinimal:
                    for constr in self.model.getConstrs():
                        if constr.IISConstr:
                            outputs["IIS"].append(constr.ConstrName)
                else:
                    outputs["status"] = "UNBOUNDED"
            elif self.model.status == GRB.CUTOFF:
                outputs["status"] = "CUTOFF"
            elif self.model.status == GRB.ITERATION_LIMIT:
                outputs["status"] = "ITERATION_LIMIT"
            elif self.model.status == GRB.NODE_LIMIT:
                outputs["status"] = "NODE_LIMIT"
            elif self.model.status == GRB.TIME_LIMIT:
                outputs["status"] = "TIME_LIMIT"
            else:
                outputs["status"] = f"未知状态: {self.model.status}"

        return outputs
        return json.dumps(outputs, ensure_ascii=False, indent=4)




    def check_for_conflicts(self):
        """检查模型是否存在冲突"""
        self.model.computeIIS()
        if self.model.IIS.status == GRB.INFEASIBLE:
            print("冲突检测结果：")
            for constr in self.model.getConstrs():
                if constr.IISConstr:
                    print(f"冲突约束：{constr.ConstrName}")
            return True
        else:
            print("没有发现冲突约束")
            return False

    def print_model(self):
        """打印模型的变量、目标函数和约束到控制台"""
        print("======== 模型变量 ========")
        for var in self.model.getVars():
            print(f"变量 {var.VarName}: 取值范围 [{var.LB}, {var.UB}], 类型: {var.VType}, 目标系数: {var.Obj}")
        
        print("\n======== 目标函数 ========")
        obj = self.model.getObjective()
        obj_expr = []
        for i in range(obj.size()):
            var = obj.getVar(i)
            coeff = obj.getCoeff(i)
            obj_expr.append(f"{coeff}*{var.VarName}")
        obj_str = " + ".join(obj_expr)
        print(f"目标函数: {obj_str}")
        
        print("\n======== 模型约束 ========")
        for constr in self.model.getConstrs():
            constr_name = constr.ConstrName
            expr = self.model.getRow(constr)
            lhs = []
            for j in range(expr.size()):
                var = expr.getVar(j)
                coeff = expr.getCoeff(j)
                lhs.append(f"{coeff}*{var.VarName}")
            lhs_str = " + ".join(lhs)
            sense = constr.Sense
            if sense == GRB.LESS_EQUAL:
                sense_str = "<="
            elif sense == GRB.GREATER_EQUAL:
                sense_str = ">="
            elif sense == GRB.EQUAL:
                sense_str = "="
            else:
                sense_str = "?"
            rhs = constr.RHS
            print(f"约束 {constr_name}: {lhs_str} {sense_str} {rhs}")
