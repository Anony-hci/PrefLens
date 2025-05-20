class ProblemModel:
    def __init__(self):
        self.objectives = []  # 存储目标函数
        self.constraints = []  # 存储约束
        self.global_constraints = []
    
    def set_global_constraints(self, constraints):
        self.global_constraints = constraints
    
    def set_default_model(self):
        self.add_objective(
            description="最大化课程总数",
            expression="""
def total_courses(items, vars):
    total_courses = 0
    for item in items:
        key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
        if key in vars:
            total_courses += vars[key]
    return total_courses
results = total_courses(items, vars)
""",
            maximize=True,
            weight=0.5  # 默认权重为1.0
            )

    def add_objective(self, expression, expression_description=None, description=None, maximize=True, weight=1.0):
        """添加目标函数"""
        self.objectives.append({
            'expression': expression,
            'expression_description': expression_description,
            'description': description,
            'maximize': maximize,
            'weight': weight
        })
    
    def remove_objective(self, description):
        self.objectives = [obj for obj in self.objectives if obj['description'] != description]

    def update_objective(self, old_description, expression, expression_description=None, description=None, maximize=True, weight=1.0):
        """更新目标函数"""
        self.remove_objective(old_description)
        self.add_objective(expression, expression_description, description, maximize, weight)

    def add_constraint(self, lhs_name, lhs, constraint_type, rhs, lhs_description=None, description=None, is_hard_constraint=True, type=None):
        """添加约束"""
        self.constraints.append({
            'lhs_name': lhs_name,
            'lhs': lhs,
            'constraint_type': constraint_type,
            'rhs': rhs,
            'lhs_description': lhs_description,
            'description': description,
            'is_hard_constraint': is_hard_constraint,
            'type': type
        })

    def remove_constraint(self, description):
        """根据描述删除约束"""
        self.constraints = [constr for constr in self.constraints if constr['description'] != description]

    def update_constraint(self, old_description, lhs_name, lhs, constraint_type, rhs, lhs_description=None, description=None, is_hard_constraint=True, type=None):
        """更新约束"""
        self.remove_constraint(old_description)
        self.add_constraint(lhs_name, lhs, constraint_type, rhs, lhs_description, description, is_hard_constraint, type)
    
    def set_problem_model(self, problem_model):
        for obj in problem_model.get("objectives", []):
            self.add_objective(
                expression=obj['expression'],
                expression_description=obj.get('expression_description'),
                description=obj.get('description'),
                maximize=(obj.get('objective_type') == 'maximize'),
                weight=obj.get('weight', 1.0)
            )
        for constr in problem_model.get("constraints", []):
            self.add_constraint(
                lhs_name=constr['lhs_name'],
                lhs=constr['lhs'],
                constraint_type=constr['constraint_type'],
                rhs=constr['rhs'],
                lhs_description=constr.get('lhs_description'),
                description=constr.get('description'),
                is_hard_constraint=constr.get('is_hard_constraint', True),
                type=constr.get('type')
            )
            
    def update_problem_model(self, problem_model):
        # 更新目标函数
        for obj_update in problem_model.get("updated_objectives", []):
            if obj_update['type'] == 'add':
                self.add_objective(
                    expression=obj_update['expression'],
                    expression_description=obj_update.get('expression_description'),
                    description=obj_update.get('description'),
                    maximize=(obj_update['objective_type'] == 'maximize'),
                    weight=obj_update.get('weight', 1.0)
                )
            elif obj_update['type'] == 'delete':
                self.remove_objective(obj_update['old_description'])
            elif obj_update['type'] == 'update':
                self.update_objective(
                    old_description=obj_update['old_description'],
                    expression=obj_update['expression'],
                    expression_description=obj_update.get('expression_description'),
                    description=obj_update.get('description'),
                    maximize=(obj_update['objective_type'] == 'maximize'),
                    weight=obj_update.get('weight', 1.0)
                )

        # 更新约束
        for constr_update in problem_model.get("updated_constraints", []):
            if constr_update['type'] == 'add':
                self.add_constraint(
                    lhs_name= constr_update['lhs_name'],
                    lhs=constr_update['lhs'],
                    constraint_type=constr_update['constraint_type'],
                    rhs=constr_update['rhs'],
                    lhs_description=constr_update.get('lhs_description'),
                    description=constr_update.get('description'),
                    is_hard_constraint=constr_update.get('is_hard_constraint', True),
                    type=constr_update.get('type')
                )
            elif constr_update['type'] == 'delete':
                self.remove_constraint(constr_update['old_description'])
            elif constr_update['type'] == 'update':
                self.update_constraint(
                    old_description=constr_update['old_description'],
                    lhs_name=constr_update['lhs_name'],
                    lhs=constr_update['lhs'],
                    constraint_type=constr_update['constraint_type'],
                    rhs=constr_update['rhs'],
                    lhs_description=constr_update.get('lhs_description'),
                    description=constr_update.get('description'),
                    is_hard_constraint=constr_update.get('is_hard_constraint', True),
                    type=constr_update.get('type')
                )


