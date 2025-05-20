
features_py = {
    "total_courses": """
def total_courses(items, vars):
    total_courses = 0
    for item in items:
        key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
        if key in vars:
            total_courses += vars[key]
    return total_courses
results = total_courses(items, vars)
""",
#     "total_credits": """ 
# def total_credits(items, vars):
#     total_credits = 0
#     for item in items:
#         key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
#         if key in vars:
#             total_credits += int(item['学分']) * vars[key]
#     return total_credits
# results = total_credits(items, vars)
# """,
#     "first_classes": """
# def first_classes(items, vars):
#     first_class_count = 0
#     for item in items:
#         class_times = item['上课时间'].split(';')
#         for time in class_times:
#             # 如果没有'-'则跳过
#             if '-' not in time:
#                 continue
                
#             # 取'('左边的时间信息
#             time_part = time.split('(')[0]
            
#             # 按'-'拆分获取节次
#             try:
#                 day, period = time_part.split('-')
#                 key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
#                 # 如果是第一节课,计数加1
#                 if period == '1':
#                     first_class_count += vars[key]
#             except:
#                 continue
                
#     return first_class_count
# results = first_classes(items, vars)
# # """,
#     "late_classes": """
# def late_classes(items, vars):
#     late_class_count = 0
#     for item in items:
#         class_times = item['上课时间'].split(';')
#         for time in class_times:
#             # 如果没有'-'则跳过
#             if '-' not in time:
#                 continue
                
#             # 取'('左边的时间信息
#             time_part = time.split('(')[0]
            
#             # 按'-'拆分获取节次
#             try:
#                 day, period = time_part.split('-')
#                 key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
#                 # 如果是第六节课,计数加1
#                 if period == '6':
#                     late_class_count += vars[key]
#             except:
#                 continue
                
#     return late_class_count
# results = late_classes(items, vars)
# """,

#     "second_and_third_classes":"""
# def second_and_third_classes(items, vars):
#     # 用于保存每一天的第二节课和第三节课
#     second_class_courses = {day: [] for day in range(1, 8)}  # 1: 周一, 2: 周二, ..., 7: 周日
#     third_class_courses = {day: [] for day in range(1, 8)}
    
#     # 遍历所有课程
#     for item in items:
#         class_times = item['上课时间'].split(';')
#         for time in class_times:
#             # 如果没有'-'则跳过
#             if '-' not in time:
#                 continue
#             # 取'('左边的时间信息
#             time_part = time.split('(')[0]
#             # 按'-'拆分获取星期和节次
#             try:
#                 day, period = time_part.split('-')
#                 day = int(day)  # 转换为整数
#                 period = int(period)  # 转换为整数
#                 key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
                
#                 # 如果该课程存在于vars中，则处理它
#                 if key in vars:
#                     # 如果是第二节课，将课程加入第二节课列表
#                     if period == 2:
#                         second_class_courses[day].append(item)
#                     # 如果是第三节课，将课程加入第三节课列表
#                     elif period == 3:
#                         third_class_courses[day].append(item)
#             except:
#                 continue
    
#     # 创建 Gurobi 变量表达式
#     connected_courses_expression = 0
#     for day in range(1, 8):
#         for second_course in second_class_courses[day]:
#             for third_course in third_class_courses[day]:
#                 # 获取对应的 Gurobi 变量 key
#                 second_course_key = f"x_{second_course['课程名']}_{second_course['主讲教师']}_{second_course['上课时间']}"
#                 third_course_key = f"x_{third_course['课程名']}_{third_course['主讲教师']}_{third_course['上课时间']}"
                
#                 # 使用 Gurobi 变量的乘积，生成一个表达式
#                 if second_course_key in vars and third_course_key in vars:
#                     connected_courses_expression += vars[second_course_key] * vars[third_course_key]
    
#     return connected_courses_expression

# # 获取结果的表达式
# results = second_and_third_classes(items, vars)
# """,
#    'course_distribution_daily_consecutive': """
# def course_distribution_daily_consecutive(items, vars):
#     # 创建每天每节课是否有课的二维字典
#     # day: 1-7 表示周一到周日
#     # period: 1-6 表示第一节到第六节
#     period_has_class = {day: {period: 0 for period in range(1, 7)} for day in range(1, 8)}
    
#     # 遍历所有课程
#     for item in items:
#         key = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
        
#         # 如果变量存在于模型中
#         if key in vars:
#             # 解析上课时间
#             class_times = item['上课时间'].split(';')
            
#             # 遍历每个时间段
#             for time_slot in class_times:
#                 # 如果没有 '-'，则跳过
#                 if '-' not in time_slot:
#                     continue
                
#                 # 提取星期几和节次
#                 try:
#                     parts = time_slot.split('-')
#                     if len(parts) >= 2:
#                         day = int(parts[0])
#                         # 处理节次，可能包含括号如 "2(全周)"
#                         period_str = parts[1].split('(')[0]
#                         period = int(period_str)
                        
#                         # 确保 day 和 period 在有效范围内
#                         if 1 <= day <= 7 and 1 <= period <= 6:
#                             # 将该时间段的课程变量加到对应的位置上
#                             period_has_class[day][period] += vars[key]
#                 except:
#                     # 解析失败时跳过
#                     continue
    
#     # 计算每天连续上课的惩罚
#     consecutive_penalty = 0
    
#     # 遍历每一天
#     for day in range(1, 8):
#         # 遍历每个可能的连续两节课
#         for period in range(1, 6):  # 1到5，因为要检查下一节
#             # 如果当前节和下一节都有课，增加惩罚
#             consecutive_penalty += period_has_class[day][period] * period_has_class[day][period+1]
    
    
#     return consecutive_penalty

# results = course_distribution_daily_consecutive(items, vars)
# """

}