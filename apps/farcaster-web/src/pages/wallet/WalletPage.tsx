import { memo, useEffect } from 'react';
import { WalletApp, useWallet } from 'farcaster-wallet';

import { BorderedMainContent } from '~/components/BorderedMainContent';
import { Page } from '~/components/page/Page';
import { PageHeader } from '~/components/page/PageHeader';
import { PageTitle } from '~/components/page/PageTitle';

const WalletPage = memo(() => {
  const bootstrap = useWallet((s) => s.bootstrap);

  useEffect(() => {
    void Promise.resolve(useWallet.persist.rehydrate()).then(() => {
      bootstrap();
    });
  }, [bootstrap]);

  return (
    <Page meta={{ title: 'Wallet / Farcaster' }}>
      <div className="border-default sm:border-x">
        <PageHeader hideCastButton>
          <div className="flex items-center">
            <PageTitle>Wallet</PageTitle>
          </div>
        </PageHeader>
      </div>
      <BorderedMainContent className="p-0">
        <WalletApp />
      </BorderedMainContent>
    </Page>
  );
});

WalletPage.displayName = 'WalletPage';

export { WalletPage };
