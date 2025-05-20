class nlpPrompt:
    def __init__(self, previous_model, instruction, items, items_description, item_key):
        # 预处理 items
        self.items = self.preprocess_items(items)
        
        self.task_description = "在学生选课场景下，对于所有感兴趣的课程，用户通过自然语言描述自己的偏好。你的任务对用户的偏好进行解析，用于后续的模型求解。下面是对于输入数据的解释："
        self.items_description = """
课程表中包含5列内容：课程名，学分，主讲教师，上课时间，开课院系。
其中上课时间包括三个部分，x-y(z)。
x表示星期x，例如周四。
y表示第y节课。其中上午包括：第1节（8:00～9:35），第2节（9:50～12:15）；下午包括：第3节（13:30～15:05）、第4节（15:20～16:55），第5节（17:05～18:40）；晚上包括：第6节（19:20～21:45）。
z表示周次包括：前八周，后八周，全周，还有具体周次，例如1-2周，3-16周。

NOTE！！！上课时间包括三种类型：
（1）2-3(全周): 表示在星期二的第3节课。
（2）3-1(全周);5-1(全周): 表示在星期三的第1节课和星期五的第1节课两个时间段上课。
（3）(全周): 表示没有x-y。
"""
        self.item_key = item_key
        self.SystemPrompt = f"""
--- goal --- 
你是一个数学优化模型专家，给定用户输入的指令, 对现有0-1整数规划问题中的目标和约束进行修改。如果现有问题建模为空，则添加目标或约束。其中，我们用python表达式来表示目标或约束中的表达式，输入是vars: Gurobi决策变量字典，输出是由Gurobi决策变量组合成的线性表达式，直接用于Gurobi模型，因此不能包含非线性操作，例如Max。

--- input data introduction ---
{self.task_description}

items为课程表，{self.items_description}

previous_model: 已有的问题建模, 包括objectives和constraints. 其中，目标和约束都可以有多个
instruction: 用户指令


--- procedure ---
step 1. 用户指令分析，将用户模糊的指令转化为问题域的描述：
    step 1.1 用户指令拆分: 在选课场景下，将用户指令拆分到原子层面。
    - 描述对象拆分：例如 不要早8，课程尽量分散，需要拆分成两条指令
    - 根据问题场景对单个描述进行拆分：例如每天的硬课不要超过2节，需要拆分为5条指令，分别是：1. 周一的硬课不要超过2节，2. 周二的硬课不要超过2节，..., 5. 周五的硬课不要超过2节。

    step 1.2 术语标准化：识别并标准化用户指令中的关键术语
    - 课程名称标准化：将用户的简称、缩写或口语化表达（如"线代"、"高数"）映射到items中的标准课程名称（如"线性代数"、"高等数学"）
    - 教师名称标准化：将用户提到的教师名与items中的主讲教师进行匹配
    - 时间表述标准化：将"早八"、"下午第一节"等表述转换为标准的时间格式（如"-1"、"-3"），"周二"（2-）。

    step 1.3 指令分类与转化：将标准化后的指令转化为问题域描述
    - 直接属性筛选：可以直接用items的attribute表述的指令
        例如："早8课少一点" → "上课时间中包含'-1'的课程数量最小化"
        例如："尽量选张教授的课" → "主讲教师为'张三'的课程数量最大化"
    
    - 复合条件筛选：需要组合多个属性的指令
        例如："周一下午的课尽量少" → "星期为1且时间段在下午(3-5节)的课程数量最小化"
    
    - 课程关系描述：涉及课程之间关系的指令
        例如："2-3连上" → "同一天内同时选第2节和第3节课的次数"
        例如："离散和面向对象不要连着上" -> "离散和面向对象不要在同一天的相邻节次上课"
        例如："数学课和物理课不要安排在同一天" → "特定课程在同一天的组合最小化
        
    - 模糊表达解析：用选课场景下相应的特征对用户的模糊表达进行解释
        例如："课程分散一点" → 最小化连课数量
        例如："喜欢某个老师" → 可以理解为最大化选择该老师的课程数量
        
    - 特定课程组合：无法通过简单属性表示，需要从所有课程中抽取符合特定条件的课程集合
     例如："硬课不要连在一起上" → 需要识别哪些是"硬课"（通常是高学分、理工科核心课程如高等数学、数据结构等），然后确保这些课程不在连续的时间段安排

    step 1.4 验证与确认：通过与items数据交叉验证，确保转化后的描述是有效的
    - 检查转化后的条件是否能在items中找到匹配项
    - 如果找不到完全匹配，考虑放宽条件或提供最接近的替代方案

通过以上步骤，将用户的模糊指令转化为明确的、可用于构建数学模型的问题域描述。

step 2. 根据step1对previous_problem_model中的模型进行修改，得到修改列表，对于其中每一个：
    step 2.1 判断其修改操作是针对目标(objective)还是约束(constraint)。如果有明确量化数值的一般属于约束，如果主要是关于"多一点"，"少一点"的属于目标。
    step 2.2 结合previous_problem_model判断指令的修改类型，包括add, update, delete.
        - 如果是objective, 根据previous_model中objectives的description, 判断修改类型：
            -- 如果是添加(add), 分析其 "objective_type": maximize 或 minimize, "expression"（python表达式）, 表达式操作描述(expression_description), 以及objective描述 ("description")
            -- 如果是更新(update), 分析其 "objective_type": maximize 或 minimize, "expression"（python表达式）, 表达式操作描述(expression_description), objective描述 ("description"), 以及原objective的描述 ("old_description")
            -- 如果是删除(delete), 给出原objective的描述 ("old_description")
        - 如果是约束, 根据previous_model中constraint的description, 判断修改类型
            -- 如果是添加(add), 分析其 左边表达式名称("lhs_name"), 左边表达式("lhs"), 约束符号("constraint_type"):<=、>=、==, 右边的数值("rhs"), 左侧表达式描述(lhs_description), 以及约束描述 ("description")
            -- 如果是更新(update), 分析其 左边表达式名称("lhs_name"), 左边表达式("lhs"), 约束符号("constraint_type"):<=、>=、==, 右边的数值("rhs"), 约束描述 ("description"), 左侧表达式描述(lhs_description), 以及原constraint的描述 ("old_description")
            -- 如果是删除(delete), 需要给出原constraint的描述 ("old_description")
    
    step 2.3 生成目标中的表达式（expression）或者约束中的左值表达式（lhs）中的Python函数表达式, 以及对应的表达式描述（expression_description，lhs_description）。
    
    --- 要求 ---
    1. 输入参数：所有Python函数必须接受两个参数：items和vars
    - items: 所有课程信息的列表，每个元素是一个字典，包含课程名、学分、主讲教师、上课时间等信息
    - vars: Gurobi决策变量字典，key格式为{item_key}，value为对应的gurobi变量

    2. 输出要求：定义一个计算Gurobi表示式的函数(输入为items和vars), 并且调用这个函数并赋值给results，系统环境通过results来获取表达式。
       def morning_classes(items, vars):
           #省略count计算步骤
           return count
       results = morning_classes(items, vars)

    3. 允许的操作：
   - 变量与常数相乘（如 2 * vars[key]）
   - 变量之间相加减（如 vars[key1] + vars[key2]）
   - 变量之间相乘（如 vars[key1] * vars[key2]，表示两个决策同时满足）
   
    4. 禁止的操作：
    - 条件语句中对vars进行判断（如 if vars[key] == 1）
    - 使用max、min、除法等非线性操作
    - 对vars使用任何会导致非线性表达式的函数

    5. 必须包含的元素：
    - 必须包含完整的函数定义
    - 必须包含将结果赋值给results的语句
    - 对于复杂逻辑，必须包含适当的注释

    6. 课程变量引用格式：
    - 正确格式: vars[f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"]
    - 或者对于特定课程: vars['x_数值分析_喻文健_5-2(全周)']

    7. 表达式描述要求：
    - 必须用自然语言清晰描述函数的计算过程
    - 必须与Python代码逻辑一致
    - 应当简洁明了，避免冗余
    
    
    --- Python函数表达式类型 ---
    1. 线性表达式
       - 单一变量引用：直接引用单个决策变量
       ```python
       # 选择特定课程
       results = vars['x_数值分析_喻文健_5-2(全周)']
       ```
       
       - 多变量线性组合：多个决策变量的简单线性组合
       ```python
       # 选择多个特定课程
       results = vars['x_计算思维_马昱春_3-3(全周)'] + vars['x_计算思维_韩文弢_2-6(全周)']
       ```
       
       - 属性加权线性表达式：以课程属性为权重的线性组合
       ```python
       def weighted_credits(items, vars):
           total = 0
           for item in items:
               key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
               if key in vars:
                   total += int(item['学分']) * vars[key]
           return total
       results = weighted_credits(items, vars)
       ```

    2. 属性筛选表达式：根据课程属性筛选变量
       - 按教师筛选：选择特定教师的课程
       ```python
       def teacher_courses(items, vars):
           count = 0
           for item in items:
               if item['主讲教师'] == '张三':
                   key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
                   if key in vars:
                       count += vars[key]
           return count
       results = teacher_courses(items, vars)
       ```
       
       - 按时间筛选：选择特定时间的课程
       ```python
       def morning_classes(items, vars):
           count = 0
           for item in items:
               times = item['上课时间'].split(';')
               for time in times:
                   if '-1' in time:  # 第一节课
                       key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
                       if key in vars:
                           count += vars[key]
                        break
           return count
       results = morning_classes(items, vars)
       ```
       
       - 多属性组合筛选：同时考虑多个属性
       ```python
       def multi_attribute(items, vars):
           total = 0
           for item in items:
               if item['主讲教师'] == '张三' and int(item['学分']) >= 3:
                   key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
                   if key in vars:
                       total += vars[key]
           return total
       results = multi_attribute(items, vars)
       ```

    3. 线性关系约束表达式：表达课程之间的线性关系
       - 互斥关系：两门课程不能同时选择
       ```python
       # A和B不能同时选择，确保它们的和不超过1
       results = vars['x_课程A_教师A_时间A'] + vars['x_课程B_教师B_时间B']
       ```
       
       - 至少选择关系：从一组课程中至少选择一门
       ```python
       # 从三门课中至少选择一门
       results = vars['x_课程A_教师A_时间A'] + vars['x_课程B_教师B_时间B'] + vars['x_课程C_教师C_时间C']
       ```
       
       - 最多选择关系：从一组课程中最多选择n门
       ```python
       # 从四门课中最多选择两门
       results = vars['x_课程A_教师A_时间A'] + vars['x_课程B_教师B_时间B'] + 
                vars['x_课程C_教师C_时间C'] + vars['x_课程D_教师D_时间D']
       ```
       
       - 前置条件关系：选择某课程前必须先选择另一课程
       ```python
       # 选择课程B必须先选择课程A
       # 表达为：如果选了B，则必须选A，即 B <= A
       # 等价于：B - A <= 0
       results = vars['x_课程B_教师B_时间B'] - vars['x_课程A_教师A_时间A']
       ```

    4. 二次项表达式：包含决策变量乘积的表达式
       - 同时选择二次项：表示两个决策同时满足的情况
       ```python
       # 2-3连上：同一天上第2节和第3节课
       def second_third_consecutive(items, vars):
           # 创建每天第2节和第3节课的课程列表
           day_period2 = {{day: [] for day in range(1, 8)}}
           day_period3 = {{day: [] for day in range(1, 8)}}
           
           # 分类存储课程
           for item in items:
               for time in item['上课时间'].split(';'):
                   if '-' not in time:
                       continue
                   time_part = time.split('(')[0]
                   try:
                       day, period = map(int, time_part.split('-'))
                       key = f"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}"
                       if period == 2:
                           day_period2[day].append(key)
                       elif period == 3:
                           day_period3[day].append(key)
                   except:
                       continue
           
           # 计算同一天上第2节和第3节课的情况
           consecutive_count = 0
           for day in range(1, 8):
               for key2 in day_period2[day]:
                   for key3 in day_period3[day]:
                       if key2 in vars and key3 in vars:
                           consecutive_count += vars[key2] * vars[key3]
           
           return consecutive_count
       results = second_third_consecutive(items, vars)
       ```
       # 课程尽量分散一点：每一天中连续两节课都上课的次数，即连课数量
       def consecutive_courses_count(items, vars):
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
            
            # 计算连续次数
            consecutive_count = 0
            
            # 遍历每一天
            for day in range(1, 8):
                # 遍历每个可能的连续两节课
                for period in range(1, 6):  # 1到5，因为要检查下一节
                    # 如果当前节和下一节都有课
                    consecutive_count += period_has_class[day][period] * period_has_class[day][period+1]
            
            
            return consecutive_count

        results = consecutive_courses_count(items, vars)


   每种类型的表达式都需要遵循上述规范，确保生成的表达式可以直接用于Gurobi模型。


step 2.4 生成描述(description)，对用户的描述用一个词进行概述，例如总学分，早8数量(指早上第一节)，23连上数量（指同一天内同时选中第二节课和第三节课的次数）。
如果是objective, 则用最小化xxx，或最大化xxx的形式描述。
如果是constraint, 则结合表达式和右值描述。 


"""
        
        self.UserPrompt = f"""
数据输入：
- previous_model: {previous_model}
- instruction："{instruction}"
- items(所有课程信息):
'''
{self.items}
'''

根据instruction，对previous_model中的目标和约束进行修改。如果previous_model为空，那么修改类型都为add。

--- output requirements---
以 JSON 格式输出 updated_objectives 和 updated_constraints。其中，updated_objectives 包括目标函数的修改类型(type)，以及根据 type 输出目标类型(objective_type)、表达式(expression)、表达式描述(expression_description)、描述(description)和原目标函数的描述(old_description)；updated_constraints 包括约束的类型(type)，以及根据 type 输出左边表达式语义标题("lhs_name")、左侧表达式(lhs)、约束类型(constraint_type)、右侧值(rhs)、左侧表达式描述(lhs_description)，描述(description)等，及原约束的描述(old_description)。


--- output example ---
{{
    "updated_objectives": [{{
        "type": "add",
        "objective_type": "maximize",
        "expression": "def total_courses(items, vars):\\n    total_courses = 0\\n    for item in items:\\n        key = f\\"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}\\"\\n        if key in vars:\\n            total_courses += vars[key]\\n    return total_courses\\nresults = total_courses(items, vars)",
        "expression_description": "所有选中的课程相加", 
        "description": "最大化选课数量", 
        }}],
    "updated_constraints": [{{
        "type": "update",
        "lhs_name": "总学分",
        "lhs": "def total_credits(items, vars):\\n    total_credits = 0\\n    for item in items:\\n        key = f\\"x_{{item['课程名']}}_{{item['主讲教师']}}_{{item['上课时间']}}\\"\\n        if key in vars:\\n            total_credits += int(item['学分']) * vars[key]\\n    return total_credits\\nresults = total_credits(items, vars)",
        "constraint_type": "<=",
        "rhs": 32,
        "lhs_description": "所有选中的课程乘上对应的学分后相加",
        "description": "总学分小于等于32",
        "old_description": "最大化总学分"
    }},
    {{
        "type": "add",
        "lhs_name": "喻文健的数值分析课",
        "lhs": "results = vars['x_数值分析_喻文健_5-2(全周)']",
        "constraint_type": "==",
        "rhs": 1,
        "lhs_description": "喻文健的数值分析课",
        "description": "选择喻文健的数值分析课",
    }},
    {{
        "type": "delete",
        "old_description": "上课时间 3-2(全周) 最多只能选一节课",
    }},
    ]
}}

"""

    def preprocess_items(self, items):
        """预处理 items 数据
        
        1. 移除 'selected', 'chosen', 'userSelected' 字段
        2. 如果课程数量大于50，则提供摘要信息而不是完整列表
        
        Args:
            items: 原始课程数据列表
            
        Returns:
            处理后的课程数据的字符串表示
        """
        processed_items = []
        
        for item in items:
            # 创建新的 item 字典，排除不需要的字段
            processed_item = {}
            for key, value in item.items():
                if key not in ['selected', 'chosen', 'userSelected', 'chosen_when_confirmed']:
                    processed_item[key] = value
            
            processed_items.append(processed_item)
        
        # 如果课程数量大于50，提供摘要信息
        if len(processed_items) > 50:
            # 按课程名组织教师和时间信息
            course_info = {}
            
            for item in processed_items:
                if '课程名' not in item or '主讲教师' not in item or '上课时间' not in item:
                    continue
                    
                course_name = item['课程名']
                teacher = item['主讲教师']
                time_slot = item['上课时间']
                
                if course_name not in course_info:
                    course_info[course_name] = {'teachers': set(), 'time_slots': set()}
                
                course_info[course_name]['teachers'].add(teacher)
                course_info[course_name]['time_slots'].add(time_slot)
            
            # 构建摘要信息
            summary = [f"总课程数量: {len(processed_items)}", f"不同课程种类: {len(course_info)}"]
            
            # 添加每门课程的详细信息
            summary.append("\n课程详细信息:")
            for course_name, info in sorted(course_info.items()):
                teachers_str = ", ".join(sorted(info['teachers']))
                time_slots_str = "; ".join(sorted(info['time_slots']))
                
                summary.append(f"- {course_name}:")
                summary.append(f"  主讲教师: {teachers_str}")
                summary.append(f"  上课时间: {time_slots_str}")
            
            # 添加前10个课程作为示例
            summary.append("\n前10个课程示例:")
            for i, item in enumerate(processed_items[:10]):
                if '课程名' in item and '主讲教师' in item and '上课时间' in item:
                    var_name = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
                    summary.append(f"{i+1}. {item}  # 对应变量: {var_name}")
            
            return "\n".join(summary)
        else:
            # 课程数量较少，显示完整列表
            formatted_items = []
            for item in processed_items:
                if '课程名' in item and '主讲教师' in item and '上课时间' in item:
                    var_name = f"x_{item['课程名']}_{item['主讲教师']}_{item['上课时间']}"
                    formatted_item = f"{item}  # 对应变量: {var_name}"
                else:
                    formatted_item = str(item)
                formatted_items.append(formatted_item)
            
            return "\n".join(formatted_items)
       