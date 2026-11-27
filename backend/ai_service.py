from abc import ABC, abstractmethod
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class AIService(ABC):
    """AI服务抽象基类"""
    
    def __init__(self, client, model_name: str):
        self.client = client
        self.model_name = model_name
    
    @abstractmethod
    def get_name(self) -> str:
        """获取服务名称"""
        pass
    
    def is_available(self) -> bool:
        """检查服务是否可用"""
        return self.client is not None
    
    def chat_completion(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 1000) -> Optional[str]:
        """
        调用AI聊天完成接口
        返回AI响应内容，失败时返回None
        """
        if not self.is_available():
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"{self.get_name()} API error: {e}")
            return None


class DeepSeekService(AIService):
    """DeepSeek AI服务"""
    
    def __init__(self, client):
        super().__init__(client, "deepseek-chat")
    
    def get_name(self) -> str:
        return "DeepSeek"


class OpenAIService(AIService):
    """OpenAI服务"""
    
    def __init__(self, client):
        super().__init__(client, "gpt-3.5-turbo")
    
    def get_name(self) -> str:
        return "OpenAI"


class ZhipuService(AIService):
    """智谱AI服务"""
    
    def __init__(self, client):
        super().__init__(client, "glm-4")
    
    def get_name(self) -> str:
        return "Zhipu"


class AIServiceManager:
    """AI服务管理器，负责统一管理和调用AI服务"""
    
    def __init__(self):
        self.services: List[AIService] = []
    
    def register_service(self, service: AIService):
        """注册AI服务"""
        self.services.append(service)
    
    def chat_completion_with_fallback(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 1000) -> Optional[str]:
        """
        使用降级策略调用AI服务
        按注册顺序依次尝试，直到成功或全部失败
        """
        for service in self.services:
            if service.is_available():
                response = service.chat_completion(messages, temperature, max_tokens)
                if response:
                    return response
        
        logger.warning("All AI services failed")
        return None
