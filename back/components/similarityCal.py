import numpy as np

# 提取变量和特征
def extract_variables_and_features(solution):
    variables = list(solution['Variables'].values())
    features = list(solution['features'].values())
    return variables, features

# 计算余弦相似度
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 正则化特征
def normalize(features, features_max, features_min):
    features = np.array(features)
    range = features_max - features_min
    # 检查每个特征的范围
    mask = (range == 0)
    # 对于范围为零的特征，直接设置为零
    normalized_features = np.where(mask, 0, (features - features_min) / range)
    return normalized_features

# 计算 variables 的相似度（相同的个数）
def calculate_variables_similarity(base_variables, variables):
    return sum(1 for a, b in zip(base_variables, variables) if a == b) / len(variables)

# 计算 features 的相似度
def calculate_features_similarity(base_features_normalized, features_normalized):
    return cosine_similarity(base_features_normalized, features_normalized)

def calculate_similarity_with_base_solution(base_solution, results):

    # 提取 base_solution 的变量和特征
    base_variables, base_features = extract_variables_and_features(base_solution)
    print(f"base_var: {base_variables}, fea: {base_features}, solution: {base_solution}")

    # 提取所有解决方案的 features
    all_features = [list(solution['features'].values()) for solution in results['solutions']]

    # 计算每个特征的最大值和最小值
    features_max = np.max(all_features, axis=0)
    features_min = np.min(all_features, axis=0)
    # print(f"features: {all_features}, max: {features_max}, min: {features_min}")

    # 正则化 base_solution 的特征
    base_features_normalized = normalize(base_features, features_max, features_min)
    # print(f"base: {base_features_normalized}")

    # 计算每个解决方案的相似度并加入 similarity 项
    for solution in results['solutions']:
        variables, features = extract_variables_and_features(solution)
        
        # 正则化当前解决方案的特征
        features_normalized = normalize(features, features_max, features_min)
        # print(f"features_normalized: {features_normalized}")
        
        # 计算 variables 的相似度
        variables_similarity = calculate_variables_similarity(base_variables, variables)
        print(f"var_sim: {variables_similarity}")
        
        # 计算 features 的相似度
        features_similarity = calculate_features_similarity(base_features_normalized, features_normalized)
        # print(f"simi: {features_similarity}")
        
        # 计算综合相似度
        overall_similarity = (variables_similarity + features_similarity) / 2
        
        # 将相似度信息加入 solution
        # solution['similarity'] = {
        #     'variables_similarity': variables_similarity,
        #     'features_similarity': features_similarity,
        #     'overall_similarity': overall_similarity
        # }
        solution['features']['similarity'] = round(variables_similarity, 2)
        # print(solution['similarity'])

    # 提取所有 variables_similarity 的值
    variables_similarities = [solution['features']['similarity'] for solution in results['solutions']]

    # 获取独特的值并排序
    unique_similarities = sorted(set(variables_similarities))

    # 如果独特的值超过3个，则取第三个值作为阈值
    threshold = unique_similarities[2] if len(unique_similarities) > 3 else min(unique_similarities)

    # 筛选 overall_similarity 大于 0.5 的解决方案
    filtered_solutions = [solution for solution in results['solutions'] if solution['features']['similarity'] >= threshold]

    # 根据 overall_similarity 从高到低排序
    filtered_solutions.sort(key=lambda x: x['features']['similarity'], reverse=True)
    filtered_results = {}
    filtered_results['status'] = "OPTIMAL"
    filtered_results['solutionNum'] = len(filtered_solutions)
    filtered_results['solutions'] = filtered_solutions
    # print(filtered_results)
    return filtered_results

def sort_results(results):
    
    # 提取基准解决方案中的时间段
    base_time_slots = set()
    base_solution = results['solutions'][0]
    # 解析基准解决方案
    for var_name, value in base_solution['Variables'].items():
        if value == 1:
            # 解析变量名 x_课程名_主讲教师_上课时间
            parts = var_name.split('_', 1)
            if len(parts) > 1:
                details = parts[1].split('_')
                if len(details) >= 3:
                    time_str = details[2]
                    # 处理可能包含多个时间段的情况
                    time_slots = time_str.split(';')
                    for time_slot in time_slots:
                        time_slot = time_slot.split('(')[0]
                        base_time_slots.add(time_slot)
    
    # 按照周次和节次排序时间段
    sorted_base_time_slots = sorted(base_time_slots, key=lambda x: (
        int(x.split('-')[0]) if '-' in x and x.split('-')[0].isdigit() else 999,  # 周次
        int(x.split('-')[1]) if '-' in x and len(x.split('-')) > 1 and x.split('-')[1].isdigit() else 999  # 节次
    ))
    
    # print(f"基准解决方案时间段: {sorted_base_time_slots}")
    
    # 为每个时间段分配权重，越前面的权重越大
    base_slot_weights = {}
    total_slots = len(sorted_base_time_slots)
    for i, slot in enumerate(sorted_base_time_slots):
        # 权重从1.0线性递减到0.8
        base_slot_weights[slot] = 1.0 - round((i / total_slots) , 4)  if total_slots > 0 else 1.0
    
    # print(f"基准解决方案权重: {base_slot_weights}")
    # 计算每个解决方案的相似度
    for solution in results['solutions']:
        # 提取当前解决方案的时间段
        current_time_slots = set()
        
        for var_name, value in solution['Variables'].items():
            if value == 1:
                # 解析变量名
                parts = var_name.split('_', 1)
                if len(parts) > 1:
                    details = parts[1].split('_')
                    if len(details) >= 3:
                        time_str = details[2]
                        # 处理可能包含多个时间段的情况
                        time_slots = time_str.split(';')
                        for time_slot in time_slots:
                            time_slot = time_slot.split('(')[0]
                            current_time_slots.add(time_slot)
        
        # 计算时间段相似度
        similarity = calculate_time_slots_similarity(base_time_slots, base_slot_weights, current_time_slots)
        
        # 将相似度信息加入 solution
        solution['features']['similarity'] = round(similarity, 4)
    
    # 根据相似度从高到低排序
    results['solutions'].sort(key=lambda x: x['features']['similarity'], reverse=True)
    # 删除每个解决方案中的similarity特征
    for solution in results['solutions']:
        if 'features' in solution and 'similarity' in solution['features']:
            del solution['features']['similarity']
    return results

def calculate_time_slot_weight(time_slot):
    """
    计算时间段的权重，格式为 "x-y"，其中 x 表示星期，y 表示周次
    星期和周次越小，权重越大
    """
    try:
        # 处理时间段格式，去除括号内的内容
        if '(' in time_slot:
            time_slot = time_slot.split('(')[0]  # 只保留括号前的部分
        parts = time_slot.split('-')
        if len(parts) == 2:
            weekday = int(parts[0])
            period = int(parts[1])
            # 线性权重计算，星期权重比周次权重稍大
            # 归一化到0.8-1.0范围内，保持差异适度
            weekday_weight = 1.0 - (weekday - 1) * 0.2  # 星期1权重最高，递减
            period_weight = 1.0 - (period - 1) * 0.2   # 第1节权重最高，递减
            return (weekday_weight + period_weight) / 2
        return 1.0  # 默认权重
    except:
        return 1.0  # 解析失败时的默认权重

def calculate_time_slots_similarity(base_time_slots, base_slot_weights, current_time_slots):
    """
    计算两个时间表的相似度:
    1. 对于基准解决方案中的每个时间段，如果当前解决方案也包含，则增加相似度
    2. 对于当前解决方案中不在基准解决方案的时间段，减少相似度
    """
    if not base_time_slots:
        return 1.0  # 如果基准时间表为空，则认为完全相似
    
    total_similarity = 0.0
    max_possible_similarity = sum(base_slot_weights.values())
    
    # 计算匹配的时间段贡献的相似度
    for slot in base_time_slots:
        if slot in current_time_slots:
            total_similarity += base_slot_weights[slot]
    
    # 计算额外时间段的惩罚
    extra_slots = current_time_slots - base_time_slots
    penalty = 0.0
    for slot in extra_slots:
        # 计算额外时间段的权重，作为惩罚值
        slot_weight = calculate_time_slot_weight(slot)
        penalty += slot_weight * 0.5  # 惩罚系数可以调整
    
    # 最终相似度 = 匹配相似度 - 惩罚值
    final_similarity = total_similarity / max_possible_similarity if max_possible_similarity > 0 else 0
    final_similarity = max(0, final_similarity - penalty / len(base_time_slots) if base_time_slots else 0)
    
    return final_similarity

# 计算两个字典的相似度
def calculate_dict_similarity(dict1, dict2):
    # 获取所有键的并集
    all_keys = set(dict1.keys()) | set(dict2.keys())
    
    if not all_keys:
        return 1.0  # 如果两个字典都为空，则认为它们完全相似
    
    similarity = 0
    
    for key in all_keys:
        value1 = dict1.get(key, 0)
        value2 = dict2.get(key, 0)
        
        # 计算每个键的相似度贡献
        if value1 > 0 and value2 > 0:
            # 两个解决方案都包含这个项目
            similarity += min(value1, value2) / max(value1, value2)
        # 如果只有一个解决方案包含这个项目，则不增加相似度
    
    # 归一化相似度
    return similarity / len(all_keys)