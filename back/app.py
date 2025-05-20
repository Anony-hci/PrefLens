import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, request, jsonify
from flask_cors import CORS
from components.scheduler import get_global_constraints, parse_user_input, feasible_solutions_explain, generate_features, problem_solving, analyse_solution, get_featureExprs
from components.similarityCal import calculate_similarity_with_base_solution, sort_results
from components.ProblemModel import ProblemModel
from components.OptimizationModel import OptimizationModel
from case1_courses.course import add_features_to_results, update_features, get_current_features, get_default_problem_model, generate_required_course_constraints
from case1_courses.maximal_cliques import generate_clique_constraints
from case1_courses.features.features_py import features_py
from Session import Session
import uuid
from dotenv import load_dotenv
from recover import get_recover_data
import json
app = Flask(__name__)
# 允许所有来源的跨域请求
CORS(app, resources={r"/*": {"origins": "*"}})
import os
import copy

global feature_query


# 存储当前正在对话的用户信息
sessions = {}

# 配置日志记录
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # 设置日志级别为 INFO

# 创建日志格式
formatter = logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# 创建终端（控制台）处理器
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# 创建轮转文件处理器
file_handler = RotatingFileHandler('logs/app.log', maxBytes=10*1024*1024)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(formatter)

# 将处理器添加到 logger
# logger.addHandler(console_handler)
logger.addHandler(file_handler)

@app.route('/set_base_solution', methods=['POST'])
def set_base_solution():
    data = request.get_json()
    id = data.get('sessionId', 123)
    base_solution = data.get('currentSolution', {})
    results = data.get('currentSolutionResult', {})
    # sessions[id].base_solution = base_solution
    logger.info(f"base_solution: {base_solution}")
    results = calculate_similarity_with_base_solution(base_solution, results)
    solutions = {
        "message": f"已经根据您选中的方案筛选了相近的方案。",
        "solutionResults": results
    }
    return jsonify(solutions)

@app.route('/saved_features', methods=['POST'])
def saved_features():
    global feature_query
    data = request.get_json()
    id, user_input, candidate_items, problem_model = parse_data(data)
    added_feature_exprs = data.get('addedFeatureExprs', {})
    logger.info(f"addedFeatureExprs: {added_feature_exprs}")
    is_true = data.get('isTrue', None)
    if(is_true):
        for key, value in added_feature_exprs.items():
            features_py[key] = value
        sessions[id].features_exprs = features_py
        return jsonify({"sessionId": id}), 200
    elif(not is_true):
        pbModel, optiModel, results = problem_solving(candidate_items, problem_model)
        added_feature_exprs, combined_feature_exprs = generate_features(feature_query, candidate_items, results, features_py)
        results = add_features_to_results(results, candidate_items, combined_feature_exprs, pbModel)
        print(is_true)
        solutions = {
            "message": f"重新生成特征：",
            "solutionResults": results,
            "addedFeatureExprs": added_feature_exprs,
        }
        return jsonify(solutions)



@app.route('/features', methods=['POST'])
def features():
    global feature_query
    data = request.get_json()
    id, user_input, candidate_items, problem_model = parse_data(data)
    feature_query = user_input
    user_input = user_input[3:]
    pbModel, optiModel, results = problem_solving(candidate_items, problem_model)
    added_feature_exprs, combined_feature_exprs = generate_features(user_input, candidate_items, results, get_featureExprs(features_py, pbModel))
    logger.info(f"combined_feature_exprs: {combined_feature_exprs}")
    results = add_features_to_results(results, candidate_items, combined_feature_exprs, pbModel)
    logger.info(f"features, results: {results}")
    solutions = {
        "message": f"添加特征：",
        "solutionResults": results,
        "addedFeatureExprs": added_feature_exprs,
    }
    # sessions[id].pb_model = pbModel
    # sessions[id].opti_model = optiModel
    # sessions[id].results = results
    return jsonify(solutions)

@app.route('/message', methods=['POST'])
def message():
    data = request.get_json()
    id, user_input, candidate_items, problem_model = parse_data(data)
    # sessions[id].candidate_items = candidate_items
    if(user_input.startswith('至少')):
        user_input = "至少选择10节课"
    
    updated_problemModel = parse_user_input( problem_model, user_input, candidate_items)
    logger.info(f"updated_model: {updated_problemModel}")
    response_message = {
        "message": "根据你的描述，我们的理解是：",
        "problemModel": updated_problemModel
    }

    return jsonify({
        "sessionId": id,
        **response_message
    }), 200

@app.route('/incremental_solve', methods=['POST'])
def incremental_solve():
    data = request.get_json()
    id, candidate_items, problem_model, base_solution, added_variables = parse_incremental_data(data)
    required_courses = data['requiredCourses']
    pbModel, optiModel, results = problem_solving(candidate_items, problem_model, required_courses, True, base_solution, added_variables)
    course_counts = analyse_solution(results)
    # 必选课程的信息
    always_included_courses = []
    if(results['status'] == 'OPTIMAL' or results['status'] == 'TIME_LIMIT' ):
        results = add_features_to_results(results, candidate_items, features_py, pbModel)
        solution_num = results['solutionNum']
        results = sort_results(results)
        for var_name, count in course_counts.items():
            if count == solution_num and solution_num > 0:
                # 从变量名中提取课程信息
                parts = var_name.split('_')
                if len(parts) >= 4:
                    course_name = parts[1]
                    teacher = parts[2]
                    always_included_courses.append(f"{course_name}（{teacher}）")
                    
    response = {
        "always_included_courses": always_included_courses,
        "solutionResults": results,
        "featureExprs": get_featureExprs(features_py, pbModel),
        "courseCounts": course_counts,
    }
    logger.info(f"------solve function-----\npbModel objectives:{pbModel.objectives}\npbModel constraints:{ pbModel.constraints}\npbModel ")
    logger.info(f"optiModel: {optiModel.model}")
    logger.info(f"getting solutions: {results}")
    logger.info(f"featureExprs: {get_featureExprs(features_py, pbModel)}")
    
    return jsonify(response)

@app.route('/solve', methods=['POST'])
def solve():
    data = request.get_json()
    id, user_input, candidate_items, problem_model = parse_data(data)
    print(f"problem_model:\n{problem_model}")
    required_courses = data['requiredCourses']
    # sessions[id].candidate_items = candidate_items
    pbModel, optiModel, results = problem_solving(candidate_items, problem_model, required_courses)
    # optiModel.print_model()
    course_counts = analyse_solution(results)
    message = ""
    # 必选课程的信息
    always_included_courses = []
    
    if(results['status'] == 'OPTIMAL' or results['status'] == 'TIME_LIMIT'):
        results = add_features_to_results(results, candidate_items, features_py, pbModel)
        results = sort_results(results)
        solution_num = results['solutionNum']
        
        if(solution_num == 500): 
            message = "在满足上述约束的情况下，系统得到了超过500个课表。"
        elif(solution_num <= 500):
            message = f"在满足上述约束的情况下，系统得到了{solution_num}个课表。"
            # message += feasible_solutions_explain(results, candidate_items)
        
        
        for var_name, count in course_counts.items():
            if count == solution_num and solution_num > 0:
                # 从变量名中提取课程信息
                parts = var_name.split('_')
                if len(parts) >= 4:
                    course_name = parts[1]
                    teacher = parts[2]
                    always_included_courses.append(f"{course_name}（{teacher}）")
        
        if(always_included_courses):
            message += f"\n所有方案中都包括了{len(always_included_courses)}课程：{', '.join(always_included_courses)}，标记为蓝色。"
            
        message += "背景色为黄色的课程是需要您进一步选择的课程。灰色表示所有方案中都不包含的课程，您可以点击[visibility button]查看所有课程类型。"
        
        # # 添加关于必不选课程的信息
        # always_excluded_courses = []
        # for item in candidate_items:
        #     key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
        #     if key not in course_counts and solution_num > 0:
        #         always_excluded_courses.append(f"{item['课程名']}（{item['主讲教师']}）")
        #     elif key in course_counts and course_counts[key] == 0 and solution_num > 0:
        #         always_excluded_courses.append(f"{item['课程名']}（{item['主讲教师']}）")
        
        # if always_excluded_courses:
            # message += f"\n所有方案中都不包括课程：{', '.join(always_excluded_courses)}。"
            
    elif (results['status'] == "INFEASIBLE"):
        # todo 矛盾的约束
        message = "上述约束存在冲突，具体冲突的约束见左边。"
    else:
        message = "求解过程出现问题"
    
    logger.info(f"------solve function-----\npbModel objectives:{pbModel.objectives}\npbModel constraints:{ pbModel.constraints}\npbModel ")
    import os
    from datetime import datetime
    
    # 确保lp_models文件夹存在
    os.makedirs('lp_models', exist_ok=True)
    
    # 生成带时间戳的文件名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    model_path = os.path.join('lp_models', f'model_{timestamp}.lp')
    
    optiModel.model.write(model_path)
    logger.info(f"optiModel: {optiModel.model}")
    logger.info(f"获取到的课表:\n状态: {results['status']}\n解的数量: {results.get('solutionNum', 0)}\n解的详情: {json.dumps(results.get('solutions', []), indent=2, ensure_ascii=False)}")

    # sessions[id].pb_model = pbModel
    # sessions[id].opti_model = optiModel
    # sessions[id].results = results
    response = {
        "always_included_courses": always_included_courses,
        "solutionResults": results,
        "featureExprs": get_featureExprs(features_py, pbModel),
        "courseCounts": course_counts,
    }
    logger.info(f"featureExprs: {get_featureExprs(features_py, pbModel)}")
    return jsonify(response)



def parse_incremental_data(data):
    id = data.get('sessionId', 123)  # 获取会话ID
    problem_model = data.get('problemModel', {})
    candidate_items = data.get('candidateItems', [])
    
    # 解析 base_solution
    base_solution = {} 
    for item in candidate_items:
        key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
        base_solution[key] = 1 if item['chosen'] else 0

    # 解析 added_variables
    added_variables = []
    for item in candidate_items:
        if item['added']:
            key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
            added_variables.append(key)
    
    candidate_items = [item for item in candidate_items if item['selected']]
    for item in candidate_items:
        # 使用pop()方法一次性删除不需要的字段
        item.pop('selected', None)  # 如果字段存在，删除；如果不存在，不做任何操作
        item.pop('chosen', None)
        item.pop('userSelected', None)
        item.pop('added', None)
    
    return id, candidate_items, problem_model, base_solution, added_variables
    

def parse_data(data):
    id = data.get('sessionId', 123)  # 获取会话ID
    user_input = data.get('message', '')  # 获取用户消息
    problem_model = data.get('problemModel', {})
    candidate_items = data.get('candidateItems', [])  # 获取选中的项目
    candidate_items = [item for item in candidate_items if item['selected']]
    for item in candidate_items:
        # 使用pop()方法一次性删除不需要的字段
        item.pop('selected', None)  # 如果字段存在，删除；如果不存在，不做任何操作
        item.pop('chosen', None)
        item.pop('userSelected', None)
        item.pop('added', None)
        

    return id, user_input, candidate_items, problem_model

@app.route('/recover', methods = ['POST'])
def recover():
    candidateItems = get_recover_data()
    request_data = {
        "status": "success",
        "candidateItems": candidateItems,
        "message": "hello, 我是选课小助手~"
    }
    return jsonify(request_data), 200

@app.route('/hello', methods=['POST'])
def hello():
    problem_model = get_default_problem_model()
    request_data = {
        "status": "success", 
        # "problemModel": problem_model,
        "featureExprs": features_py,
        "message": "Welcome~ I am your course selection assistant~",
        }
    return jsonify(request_data), 200

@app.route('/create_session', methods=['POST'])
def create_session():
    data = request.get_json()
    id = data.get('sessionId', 123)
    file_path = f"logs/users_json/{id}.json"
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            user_data = json.load(f)
            current_preference = user_data.get('current_preference', [])
            messages = user_data.get('messages', [])
            problem_model = user_data.get('problem_model', {})
            model_nodes = user_data.get('model_nodes', [])
            features_exprs = user_data.get('features_exprs', {})
            sessions[id] = Session(current_preference, messages, problem_model, model_nodes, features_exprs)
            request_data = {
                "status": "success",
                "currentPreference": current_preference,
                "messages": messages,
                "problemModel": problem_model,
                "modelNodes": model_nodes,
            }
            return jsonify(request_data), 200
            
    else:
        # 创建新的用户数据文件
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        sessions[id] = Session([],[],{},[],{})
        return jsonify({"message": "Session created successfully."}), 200
        
            

    


@app.route('/close_session', methods=['POST'])
def close_session():
    if request.method != 'POST':
        return '', 405  # 或者让它什么都不做也行
    data = request.get_json()
    id = data.get('sessionId', 123)
    print(id)
    if id and id in sessions:
        # 保存用户数据到JSON文件
        try:
            file_path = f"logs/users_json/{id}.json"
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # 准备要保存的数据
            user_data = {
                'current_preference': sessions[id].current_preference,
                'messages': sessions[id].messages,
                'problem_model': sessions[id].problem_model,
                'model_nodes': sessions[id].model_nodes,
                'features_exprs': sessions[id].features_exprs
            }
            
            # 写入JSON文件
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(user_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"用户数据已保存到 {file_path}")
        except Exception as e:
            logger.error(f"保存用户数据时出错: {str(e)}")
        del sessions[id]
        logger.info(f"Session {id} closed and deleted.")
        return jsonify({"message": "Session closed and deleted successfully."}), 200
    else:
        return jsonify({"message": "Session not found."}), 404

@app.route('/required_courses', methods=['POST'])
def required_courses():
    data = request.get_json()
    id = data.get('sessionId', 123)
    required_courses = data.get('requiredCourses', [])
    logger.info(f"Received required courses: {required_courses}")
    
    # 构建响应消息
    if required_courses:
        message = f"已将以下课程设置为必修课：{', '.join(required_courses)}。这意味着在所有方案中，这些课程必须被选择。"
    else:
        message = "新增的课程没有必修课。对于这些新增加的课程，你想要选几节？"
    return jsonify({
        "message": message,
    })
    
    
@app.route('/log_user_action', methods=['POST', 'OPTIONS'])
def log_user_action():
    return jsonify({"message": "logged successfully."}), 200

@app.route('/update_messages', methods=['POST'])
def update_messages():
    data = request.get_json()
    id = data.get('sessionId', 123)
    new_messages = data.get('messages', [])
    
    if id in sessions:
        sessions[id].messages = new_messages
        return jsonify({"message": "Messages updated successfully."}), 200
    else:
        return jsonify({"message": "Session not found."}), 404

@app.route('/update_candidate_items', methods=['POST'])
def update_candidate_items():
    data = request.get_json()
    id = data.get('sessionId', 123)
    new_candidate_items = data.get('candidateItems', [])
    
    if id in sessions:
        sessions[id].candidate_items = new_candidate_items
        return jsonify({"message": "Candidate items updated successfully."}), 200
    else:
        return jsonify({"message": "Session not found."}), 404

@app.route('/update_model_nodes', methods=['POST'])
def update_model_nodes():
    data = request.get_json()
    id = data.get('sessionId', 123)
    new_model_nodes = data.get('modelNodes', [])
    
    if id in sessions:
        sessions[id].model_nodes = new_model_nodes
        return jsonify({"message": "Model nodes updated successfully."}), 200
    else:
        return jsonify({"message": "Session not found."}), 404

@app.route('/update_preference', methods=['POST'])
def update_preference():
    data = request.get_json()
    id = data.get('sessionId', 123)
    new_preference = data.get('currentPreference', [])
    
    if id in sessions:
        sessions[id].current_preference = new_preference
        return jsonify({"message": "CurrentPreference updated successfully."}), 200
    else:
        return jsonify({"message": "Session not found."}), 404

if __name__ == '__main__':
    load_dotenv('.env')
    # 获取 API 密钥和端点
    app.run(host='0.0.0.0', port=8010, debug=True)
