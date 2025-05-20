import sys
import os
# 将项目根目录添加到 sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import re
import json
import pandas as pd
import numpy as np
import gurobipy as gp
from gurobipy import GRB
from llm.chat import openai_client, construct_user
from llm.prompts.conGenPrompt import conGenPrompt
from llm.prompts.feaGenPrompt import feaGenPrompt
from llm.prompts.nlpPrompt import nlpPrompt
from llm.prompts.feasibleExplainPrompt import feasibleExplainPrompt
from components.OptimizationModel import OptimizationModel
from components.ProblemModel import ProblemModel
from case1_courses.course import search_course, merge_course_info, get_global_constraints,  add_features_to_results, items_description, item_key 
from case1_courses.features.features_py import features_py



def generate_constraint(items):
    prompt = conGenPrompt(items)
    response = openai_client.sync_call_gpt(prompt.SystemPrompt, [construct_user(prompt.UserPrompt)], "gpt-4o")
    return response

def generate_features(query, items, results, feature_exprs_lambda):    
    variables = results['solutions'][0]['Variables']
    prompt = feaGenPrompt(query, items, item_key, items_description)
    print(f"generate_features: {prompt.SystemPrompt}, \n {prompt.UserPrompt}")
    response = openai_client.sync_call_gpt(prompt.SystemPrompt, [construct_user(prompt.UserPrompt)], "gpt-4o", True)
    print(f"response of generate_features: {response}")
    # feature_name = extract_function_name(response)
    added_feature_exprs = {response['feature_name']: response['python_code']}
    combined_feature_exprs = {**feature_exprs_lambda, **added_feature_exprs}
    print(f"updated feature_exprs_lambda: {feature_exprs_lambda}")
    return added_feature_exprs, combined_feature_exprs


def problem_solving(selected_items, problem_model, required_courses, is_incremental = False, base_solution = None, added_variables = None):
    pbModel = ProblemModel()
    global_constraints = get_global_constraints(selected_items, required_courses)
    pbModel.set_global_constraints(global_constraints) 
    # pbModel.set_default_model()
    pbModel.set_problem_model(problem_model)
    optiModel = OptimizationModel()
    if (is_incremental):
        optiModel.set_incremental_optimization_model(base_solution, added_variables, selected_items, pbModel)
    else:
        optiModel.set_optimization_model(selected_items, pbModel)
    results = optiModel.optimize()
    return pbModel, optiModel, results

def get_featureExprs(features_py, problem_model):
    # 创建一个新字典，复制 features_py 中的所有特征
    featuresAll = features_py.copy()
    # 添加 problem_model 中的目标函数作为特征
    for objective in problem_model.objectives:
        key = "obj:" + objective['description']
        featuresAll[key] = objective['expression']
    # 添加 problem_model 中的目标函数作为特征
    for constraint in problem_model.constraints:
        key = "con:" + constraint['lhs_name'] 
        featuresAll[key] = constraint['lhs']
    
    return featuresAll

def case1_course():
    input_text = "帮忙选课,要求总学分不超过26分。尽量选可视化"
    csv_file = "back/case1_courses/courses.csv"
    # csv_file = "back/case1_courses/courses4.csv"
    items = search_course(csv_file)
    # course_info1 = search_course(csv_file, ["计算机程序设计基础","数据结构与算法","数字逻辑实验", "C++语言程序设计"], "是否必修", True)
    # course_info2 = search_course(csv_file, ["数据可视化", "密码学与网络安全", "大模型与生成式人工智能", "计算机辅助设计技术基础", "计算机组成与系统结构", "人工智能导论","软件工程","数字图像处理","数字系统设计自动化","计算机网络原理", "面向对象程序设计基础"], "是否必修", False)
    # # 合并 course_info1 和 course_info2
    # items = merge_course_info(course_info1, course_info2)
    return input_text, items

def case2_travel():
    topic = "TravelPlan"
    input_text = "规划一个旅行，要求总时间不超过10小时，必去景点的满意度至少5，可选景点的满意度最多7。"    
    # 定义待选的活动（items）
    items = [
        {'name': '大峡谷', 'time': 3, 'satisfaction': 8, 'mandatory': True},
        {'name': '博物馆', 'time': 2, 'satisfaction': 6, 'mandatory': False},
        {'name': '城市观光', 'time': 5, 'satisfaction': 7, 'mandatory': True},
        {'name': '购物中心', 'time': 2, 'satisfaction': 5, 'mandatory': False}
    ]
    return items


def parse_user_input(previous_model, instruction, items):
    prompt = nlpPrompt(previous_model, instruction, items, items_description, item_key)
    print(f"parse_user_input: {prompt.SystemPrompt}, {prompt.UserPrompt}")
    result = openai_client.sync_call_gpt(prompt.SystemPrompt, [construct_user(prompt.UserPrompt)], "gpt-4o", return_json=True)
    return result

def feasible_solutions_explain(solutions, items):
    prompt = feasibleExplainPrompt(solutions, items)
    result = openai_client.sync_call_gpt(prompt.SystemPrompt, [construct_user(prompt.UserPrompt)], "gpt-4o")
    return result




def main():
    user_input, items = case1_course()
    pbModel = ProblemModel()
    global_constraints = get_global_constraints(items)
    # print("---\nglobal_constraints:", global_constraints)
    pbModel.set_global_constraints(global_constraints)
    # updated_problem_model = parse_user_input(user_input)
    updated_problem_model = {
        "updated_objectives": [{
                "type": "add",
                "objective_type": "maximize",
                "expression": features_py['total_courses'],
                "description": "最大化选择的课程数量", 
                }],
            # "updated_constraints": [{
            #     "type": "add",
            #     "lhs": features_py['total_credits'],
            #     "constraint_type": "<=",
            #     "rhs": 12,
            #     "description": "总学分小于等于12",
            #     },
            #     {
            #     "type": "add",
            #     "lhs": features_py['first_classes'],
            #     "constraint_type": "==",
            #     "rhs": 1,
            #     "description": "早8只能是一节",
            #     }
            # ],
                    
    }
    pbModel.update_problem_model(updated_problem_model)
    # print("----\npbModel objectives:", pbModel.objectives, "pbModel constraints:", pbModel.constraints)
    optiModel = OptimizationModel()
    optiModel.set_optimization_model(items, pbModel)
    results = optiModel.optimize()
    course_counts = analyse_solution(results)
    results = add_features_to_results(results, items, features_py, pbModel)
    # print(course_counts)
    
def analyse_solution(results):
    # 创建一个字典来存储每个课程的出现次数
    course_counts = {}
    
    # 遍历所有解决方案
    for solution in results.get('solutions', []):
        variables = solution.get('Variables', {})
        
        # 遍历所有变量
        for var_name, value in variables.items():
            # 只处理取值为1的变量（被选中的课程）
            if value == 1.0:
                # 如果课程不存在于统计字典中，初始化计数为1
                if var_name not in course_counts:
                    course_counts[var_name] = 1
                else:
                    # 如果课程已存在，增加计数
                    course_counts[var_name] += 1
    
    return course_counts

if __name__ == "__main__":
    main()


# todo: gurobi修改，支持得到多个解，以及获得求解过程
# 软约束还没处理; 结果的解释（由pilot解释）

# 挑战：1. 如果数据库里的内容很多，如何将数据导入 （还是不考虑，将其作为limitation）
# 后续：常识性约束可以在wizard总结有哪几类缺失后进行补充

