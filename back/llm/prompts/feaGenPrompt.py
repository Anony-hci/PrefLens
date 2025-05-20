class feaGenPrompt:
    def __init__(self, query, items, item_key, items_description):
        self.SystemPrompt = f'''
我们将选课任务构建为0-1整数规划问题，其中每个课程对应一个二值决策变量：{item_key}。给定课程（items）以及对应的决策变量（vars），为用户需要的特征（query）编写Python代码，用于约束中的左侧表达式（lhs）或目标函数的表达式（expression）。

--- 重要说明 ---
1. 输入的vars是Gurobi决策变量字典，只能用于线性表达式构建，不能用于条件判断或比较操作
2. 必须将最终的线性表达式赋值给results变量，该表达式将直接用于Gurobi模型
3. 允许的操作：
   - 变量与常数相乘（如 2 * vars[key]）
   - 变量之间相加减（如 vars[key1] + vars[key2]）
   - 变量之间相乘（如 vars[key1] * vars[key2]，表示两个决策同时满足）
4. 禁止的操作：
   - 条件语句中对vars进行判断（如 if vars[key] == 1）
   - 使用max、min、除法等非线性操作
   - 对vars使用任何会导致非线性表达式的函数

--- 处理模糊表达 ---
当用户的表达比较模糊时，需要根据选课场景利用现有数据的属性进行合理解释, 例如：
1. "课程分散一点" - 可以理解为减少连续上课的数量，或者使课程在一周内均匀分布
2. "不要太累" - 可以理解为限制每天的课程数量，或避免连续多节课
3. "喜欢某个老师" - 可以理解为最大化选择该老师的课程数量

--- 处理复杂关系 ---
当需要表达变量之间的复杂关系时，可以使用以下方法：
 
1. 互斥关系：如果两门课不能同时选，可以添加约束使它们的和不超过1，如 vars[key1] + vars[key2] <= 1
2. 至少选择关系：如果在一组课程中至少选择一门，可以添加约束使它们的和大于等于1，如 vars[key1] + vars[key2] + vars[key3] >= 1
3. 最多选择关系：如果在一组课程中最多选择n门，可以添加约束使它们的和不超过n，如 vars[key1] + vars[key2] + vars[key3] <= 2
4. 前置条件关系：如果课程A是课程B的先修课，则选择B必须选择A，可以添加约束 vars[keyB] - vars[keyA] <= 0
5. 同时选择关系（二次项）：如果需要表示同时选择两门课的情况，可以使用变量间的乘积，如 vars[key1] * vars[key2]

--- example 1 ---
query：总课程数量

对应的Python代码为：
def total_courses(items, vars):
    total = 0
    for item in items:
        key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
        if key in vars:
            total += vars[key]
    return total
results = total_courses(items, vars)


--- example 2 ---
query: 早8课程数量

对应的Python代码为：
def early_morning_classes(items, vars):
    count = 0
    for item in items:
        key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
        if key in vars:
            class_times = item['上课时间'].split(';')
            for time in class_times:
                # 如果没有'-'则跳过
                if '-' not in time:
                    continue
                # 取'('左边的时间信息
                time_part = time.split('(')[0]
                # 按'-'拆分获取节次
                try:
                    day, period = time_part.split('-')
                    # 如果是第一节课,计数加1
                    if period == '1':
                        count += vars[key]
                except:
                    continue
    return count
results = early_morning_classes(items, vars)

--- example 3 ---
query: 课程分散度（避免连续上课）

对应的Python代码为：
def course_distribution_daily_consecutive(items, vars):
    # 创建每天每节课是否有课的二维字典
    # day: 1-7 表示周一到周日
    # period: 1-6 表示第一节到第六节
    period_has_class = {{day: {{period: 0 for period in range(1, 7)}} for day in range(1, 8)}}
    
    # 遍历所有课程
    for item in items:
        key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
        
        # 如果变量存在于模型中
        if key in vars:
            # 解析上课时间
            class_times = item['上课时间'].split(';')
            
            # 遍历每个时间段
            for time_slot in class_times:
                # 如果没有 '-'，则跳过
                if '-' not in time_slot:
                    continue
                
                # 提取星期几和节次
                try:
                    parts = time_slot.split('-')
                    if len(parts) >= 2:
                        day = int(parts[0])
                        # 处理节次，可能包含括号如 "2(全周)"
                        period_str = parts[1].split('(')[0]
                        period = int(period_str)
                        
                        # 确保 day 和 period 在有效范围内
                        if 1 <= day <= 7 and 1 <= period <= 6:
                            # 将该时间段的课程变量加到对应的位置上
                            period_has_class[day][period] += vars[key]
                except:
                    # 解析失败时跳过
                    continue
    
    # 计算每天连续上课的惩罚
    consecutive_penalty = 0
    
    # 遍历每一天
    for day in range(1, 8):
        # 遍历每个可能的连续两节课
        for period in range(1, 6):  # 1到5，因为要检查下一节
            # 如果当前节和下一节都有课，增加惩罚
            consecutive_penalty += period_has_class[day][period] * period_has_class[day][period+1]
    
    # 返回负的惩罚值（最大化时表示最小化连续课程）
    return -consecutive_penalty
results = course_distribution_daily_consecutive(items, vars)

--- example 4 ---
query: 喜欢某个老师的课程

对应的Python代码为：
def preferred_teacher_courses(items, vars):
    # 假设喜欢的老师是"张三"
    preferred_teacher = "张三"
    preferred_count = 0
    
    for item in items:
        key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
        if key in vars and item['主讲教师'] == preferred_teacher:
            preferred_count += vars[key]
    
    return preferred_count
results = preferred_teacher_courses(items, vars)

'''

        self.UserPrompt = f'''
- query: {query}
- items 描述： {items_description}.
- items 中的部分课程信息为:
{items}


--- output format ---
以json的格式输出feature_name以及python代码，不要解释，不要输出多余的符号。例如:
{{
    "feature_name": "晚上课程数量",
    "python_code": "def evening_classes(items, vars):\\n    count = 0\\n    for item in items:\\n        key = f\\"x_{{item[\\'课程名\\']}}{{item[\\'主讲教师\\']}}{{item[\\'上课时间\\']}}\\\"\\n        if key in vars:\\n            class_times = item[\\'上课时间\\'].split(\\';\\')\\n            for time in class_times:\\n                if \\'-\\' not in time:\\n                    continue\\n                time_part = time.split(\\'(\\')[0]\\n                try:\\n                    day, period = time_part.split(\\'-\\')\\n                    if period == \\'6\\':\\n                        count += vars[key]\\n                except:\\n                    continue\\n    return count\\nresults = evening_classes(items, vars)",
}}
    

'''

