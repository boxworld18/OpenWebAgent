from .model import model_call
from .wot_id_prompt import WoTIDAgent
from .new_asp_prompt import NewASPAgent
agent_type = {
    'new_asp': NewASPAgent,
    'wot_id': WoTIDAgent
}