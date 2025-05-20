import re
from itertools import combinations

def parse_week_range(week_str):
    """解析周次范围字符串，返回起止周数元组"""
    if week_str == "全周":
        return (1, 16)
    elif week_str == "前八周":
        return (1, 8)
    elif week_str == "后八周":
        return (9, 16)
    elif "-" in week_str and "周" in week_str:
        start, end = map(int, re.findall(r"\d+", week_str))
        return (start, end)
    return (0, 0)  # 无效值

def parse_time_slots(time_str):
    """解析课程时间字符串为结构化数据"""
    slots = []
    
    # 处理线上课程
    if time_str.startswith("("):
        week_str = time_str[1:-1]
        slots.append({
            "type": "online",
            "weeks": parse_week_range(week_str)
        })
        return slots
    
    # 处理线下多时间段
    for segment in re.split(r",\s*", time_str):
        match = re.match(r"(\d+)-(\d+)\((.*?)\)", segment)
        if match:
            weekday = int(match.group(1))
            session = int(match.group(2))
            weeks = parse_week_range(match.group(3))
            slots.append({
                "type": "offline",
                "weekday": weekday,
                "session": session,
                "weeks": weeks
            })
    return slots

def has_conflict(course1, course2):
    """判断两门课程是否冲突"""
    # 同一课程不同实例直接冲突
    if course1["课程名"] == course2["课程名"]:
        return True
    
    # 获取时间槽组合
    slots1 = parse_time_slots(course1["上课时间"])
    slots2 = parse_time_slots(course2["上课时间"])
    
    for s1 in slots1:
        for s2 in slots2:
            # 线上课程不参与时间冲突检查
            if s1["type"] == "online" or s2["type"] == "online":
                continue
                
            # 周次不重叠则跳过
            if (s1["weeks"][1] < s2["weeks"][0] or 
                s2["weeks"][1] < s1["weeks"][0]):
                continue
                
            # 检查具体时间冲突
            if (s1["weekday"] == s2["weekday"] and 
                s1["session"] == s2["session"]):
                return True
    return False

def build_conflict_graph(courses):
    """构建课程冲突图"""
    n = len(courses)
    graph = {i: set() for i in range(n)}
    
    for i, j in combinations(range(n), 2):
        if has_conflict(courses[i], courses[j]):
            graph[i].add(j)
            graph[j].add(i)
    return graph

def bronkkerbosch(R, P, X, graph, cliques):
    """Bron-Kerbosch算法实现"""
    if not P and not X:
        cliques.append(frozenset(R))
        return
    
    for v in list(P):
        neighbors = graph[v]
        bronkkerbosch(R | {v}, P & neighbors, X & neighbors, graph, cliques)
        P.remove(v)
        X.add(v)

def find_maximal_cliques(courses):
    """寻找所有极大团"""
    graph = build_conflict_graph(courses)
    cliques = []
    bronkkerbosch(set(), set(graph.keys()), set(), graph, cliques)
    
    # 过滤极大团
    maximal_cliques = []
    for clique in cliques:
        if not any(clique.issubset(other) for other in cliques if clique != other):
            maximal_cliques.append(list(clique))
    return maximal_cliques

def generate_clique_constraints(courses):
    """生成极大团约束条件"""
    vars_group = []
    
    for i, clique in enumerate(find_maximal_cliques(courses)):
        if len(clique) <= 1:
            continue  # 单节点不需要约束
        
        vars_list = []
        for idx in clique:
            course = courses[idx]
            # 生成唯一变量名（处理特殊字符）
            var_name = f"x_{course['课程名']}_{course['主讲教师']}_{course['上课时间'].replace(' ', '_')}"
            vars_list.append(var_name)
        
        vars_group.append(vars_list)
        # constraints.append({
        #     "lhs": f"lambda vars: {' + '.join(vars_list)}",
        #     "constraint_type": "<=",
        #     "rhs": 1,
        #     "description": f"冲突组{i+1}（{len(clique)}门课）最多选1门",
        #     "type": "极大团约束"
        # })
    
    return vars_group

# 测试示例 -------------------------------------------------
if __name__ == "__main__":
    # 示例课程数据（需转换为字典列表）
    test_courses = [
        {
            "课程名": "C++语言程序设计",
            "主讲教师": "郑莉",
            "上课时间": "2-6(全周)",
            "是否必修": True
        },
        {
            "课程名": "C++语言程序设计",
            "主讲教师": "郑莉",
            "上课时间": "3-6(全周)",
            "是否必修": True
        },
        {
            "课程名": "并行计算基础",
            "主讲教师": "薛巍",
            "上课时间": "3-6(前八周),1-6(前八周)",
            "是否必修": False
        },
        {
            "课程名": "工业数据挖掘与分析",
            "主讲教师": "徐华",
            "上课时间": "1-4(全周)",
            "是否必修": False
        }
    ]
    
    # 生成约束并打印
    constraints = generate_clique_constraints(test_courses)
    for cons in constraints:
        print(cons)