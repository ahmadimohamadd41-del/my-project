import api from './client';
import type { Plan, Subscription, Purchase, UserAccount } from '@/types';

export const getPlans = async (): Promise<Plan[]> => {
  const response = await api.get<Plan[]>('/v1/plans');
  return response.data;
};

export const getSubscription = async (customerId: string): Promise<Subscription | null> => {
  try {
    const response = await api.get<Subscription>(`/v1/customers/${customerId}/subscription`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const purchasePlan = async (planId: string): Promise<Purchase> => {
  const response = await api.post<Purchase>('/v1/purchases', { plan_id: planId });
  return response.data;
};

export const getAccount = async (telegramId: number): Promise<UserAccount> => {
  const response = await api.get<UserAccount>(`/v1/accounts?telegram_id=${telegramId}`);
  return response.data;
};