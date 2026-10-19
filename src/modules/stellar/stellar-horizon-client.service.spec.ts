import { BadRequestException } from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';
import { StellarHorizonClientService } from './stellar-horizon-client.service';

describe('StellarHorizonClientService path quotes', () => {
  const issuer = StellarSdk.Keypair.random().publicKey();

  const createService = (records: unknown[]) => {
    const strictSendPaths = jest.fn().mockReturnValue({
      call: jest.fn().mockResolvedValue({ records }),
    });
    const strictReceivePaths = jest.fn().mockReturnValue({
      call: jest.fn().mockResolvedValue({ records }),
    });
    const server = { strictSendPaths, strictReceivePaths };
    const service = new StellarHorizonClientService({
      get: jest.fn((key: string, fallback?: string) => fallback),
    } as any);
    service.getHealthyServer = jest.fn(() => server as any);
    return { service, strictSendPaths, strictReceivePaths };
  };

  it('selects the best strict-send route and caches the quote briefly', async () => {
    const { service, strictSendPaths } = createService([
      {
        source_amount: '10',
        destination_amount: '20',
        path: [{ asset_type: 'credit_alphanum4', asset_code: 'EUR', asset_issuer: issuer }],
      },
      { source_amount: '10', destination_amount: '19', path: [] },
    ]);

    const quote = await service.getPathQuote(`usdc:${issuer}`, 'xlm', '10', 'strict-send');
    const cached = await service.getPathQuote(`USDC:${issuer}`, 'XLM', '10', 'strict-send');

    expect(quote).toMatchObject({
      mode: 'strict-send',
      sourceAsset: `USDC:${issuer}`,
      destAsset: 'XLM',
      sourceAmount: '10',
      destAmount: '20',
      path: [{ assetCode: 'EUR', assetIssuer: issuer, native: false }],
      slippageEstimatePercent: 5,
      slippageEstimateBasis: 'next-best-path',
      cached: false,
    });
    expect(cached.cached).toBe(true);
    expect(strictSendPaths).toHaveBeenCalledTimes(1);
  });

  it('requests and selects the least-source-amount strict-receive route', async () => {
    const { service, strictReceivePaths } = createService([
      { source_amount: '12', destination_amount: '10', path: [] },
      { source_amount: '11', destination_amount: '10', path: [] },
    ]);

    const quote = await service.getPathQuote('XLM', `USDC:${issuer}`, '10', 'strict-receive');

    expect(quote.sourceAmount).toBe('11');
    expect(quote.destAmount).toBe('10');
    expect(quote.slippageEstimatePercent).toBe(9.0909);
    expect(strictReceivePaths).toHaveBeenCalledTimes(1);
    expect(strictReceivePaths.mock.calls[0][1]).toEqual(StellarSdk.Asset.native());
    expect(strictReceivePaths.mock.calls[0][2]).toBe('10');
  });

  it.each([`BAD-CODE:${issuer}`, 'USDC:not-a-stellar-key'])('rejects invalid assets before Horizon request: %s', async (asset) => {
    const { service } = createService([]);

    await expect(service.getPathQuote(asset, 'XLM', '1', 'strict-send'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(service.getHealthyServer).not.toHaveBeenCalled();
  });
});