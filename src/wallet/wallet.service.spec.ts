import { WalletService } from './wallet.service';

describe('WalletService webhook processing', () => {
  it('credits a pending top-up exactly once', async () => {
    const updateWallet = jest.fn(); const updateTransaction = jest.fn();
    const record = { id: 'tx', walletId: 'wallet', userId: 'user', amount: 10000, status: 'pending', wallet: { balance: 5000 } };
    const tx = { walletTransaction: { findUnique: jest.fn().mockResolvedValue(record), update: updateTransaction }, wallet: { update: updateWallet } };
    const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    const service = new WalletService(prisma as any, {} as any, { notifyUser: jest.fn() } as any);
    await expect(service.process({ reference: 'TOPUP-1', status: 'SUCCESS', amount: 10000 })).resolves.toEqual({ status: 'received' });
    expect(updateWallet).toHaveBeenCalledWith(expect.objectContaining({ data: { balance: { increment: 10000 } } }));
    expect(updateTransaction).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'completed', balanceAfter: 15000 }) }));
  });

  it('does not mutate a previously completed transaction', async () => {
    const tx = { walletTransaction: { findUnique: jest.fn().mockResolvedValue({ status: 'completed' }), update: jest.fn() }, wallet: { update: jest.fn() } };
    const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    const service = new WalletService(prisma as any, {} as any, { notifyUser: jest.fn() } as any);
    await service.process({ reference: 'TOPUP-1', status: 'SUCCESS', amount: 10000 });
    expect(tx.wallet.update).not.toHaveBeenCalled();
    expect(tx.walletTransaction.update).not.toHaveBeenCalled();
  });
});
