import { Router, Request, Response } from 'express';
import { AIServiceManager } from '../services/aiService.js';
import { ChatRequest, AIService } from '../types/index.js';

const router = Router();
const aiServiceManager = new AIServiceManager();

router.get('/services', (req: Request, res: Response) => {
  const availableServices = aiServiceManager.getAvailableServices();
  res.json({ services: availableServices });
});

router.post('/chat/:service', async (req: Request, res: Response) => {
  try {
    const service = req.params.service as AIService;
    const chatRequest: ChatRequest = req.body;
    
    if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    const response = await aiServiceManager.sendChatRequest(service, chatRequest);
    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process chat request',
      service: req.params.service 
    });
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { service, ...chatRequest }: { service: AIService } & ChatRequest = req.body;
    
    if (!service) {
      return res.status(400).json({ error: 'Service parameter is required' });
    }
    
    if (!chatRequest.messages || !Array.isArray(chatRequest.messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    const response = await aiServiceManager.sendChatRequest(service, chatRequest);
    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process chat request' 
    });
  }
});

export default router;