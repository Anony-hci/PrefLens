class Session:
    def __init__(self, current_preference, messages, problem_model, model_nodes, features_exprs):
        self.current_preference = current_preference
        self.messages = messages
        self.problem_model = problem_model
        self.model_nodes = model_nodes
        self.features_exprs = features_exprs