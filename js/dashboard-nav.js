export const dashboardNavGroups = [
  {
    group: 'Account',
    items: [
      ['account', 'Account', '◫', 'user-dashboard.html'],
      ['deposits', 'Deposit', '＋', 'dashboard/deposits.html'],
      ['withdrawals', 'Withdraw', '↗', 'dashboard/withdrawals.html'],
      ['trade', 'Trade', '⌁', 'dashboard/trade.html'],
      ['copy-trading', 'Copy Experts', '◎', 'dashboard/copy-trading.html'],
      ['buy-plan', 'Subscribe', '◇', 'dashboard/buy-plan.html'],
      ['digitals-gallery', 'NFTs', '▧', 'dashboard/digitals-gallery.html'],
      ['signals', 'Signal', '⌁', 'dashboard/signals.html'],
      ['loans-apply', 'Loan', '▤', 'dashboard/loans/apply.html'],
      ['tradinghistory', 'History', '◷', 'dashboard/tradinghistory.html'],
      ['accounthistory', 'Transactions', '⇄', 'dashboard/accounthistory.html'],
      ['news', 'News', '▤', 'dashboard/news.html'],
      ['account-settings', 'Account Settings', '⚙', 'dashboard/account-settings.html'],
      ['referuser', 'Referrals', '↗', 'dashboard/referuser.html']
    ]
  },
  {
    group: 'Live Analysis',
    items: [
      ['technical', 'Technical Analysis', '⌁', 'dashboard/technical.html'],
      ['chart', 'Live Market Chart', '▥', 'dashboard/chart.html'],
      ['calendar', 'Market Calendar', '▦', 'dashboard/calendar.html']
    ]
  }
];

export const pageTitles = {
  overview: ['Account', 'Account overview'],
  account: ['Account', 'Account overview'],
  deposits: ['Deposit', 'Submit and review deposit requests'],
  withdrawals: ['Withdraw', 'Submit and review withdrawal requests'],
  trade: ['Trade', 'Submit and review order requests'],
  'copy-trading': ['Copy Experts', 'Browse available copy strategies'],
  'buy-plan': ['Subscribe', 'Browse available subscription plans'],
  'digitals-gallery': ['NFTs', 'Browse available digital assets'],
  signals: ['Signal', 'Browse published market signals'],
  'loans-apply': ['Loan', 'Submit and review loan enquiries'],
  tradinghistory: ['History', 'Review completed and open trades'],
  accounthistory: ['Transactions', 'Review posted transactions and requests'],
  news: ['News', 'Read published market updates'],
  profile: ['Profile', 'View and update your account details'],
  'account-settings': ['Account Settings', 'Manage your account preferences'],
  referuser: ['Referrals', 'Share your referral code and review referrals'],
  technical: ['Technical Analysis', 'Review published technical analysis'],
  chart: ['Live Market Chart', 'View the current chart for a listed market'],
  calendar: ['Market Calendar', 'Review published market events']
};

export function activeNavKey(pageKey) {
  if (pageKey === 'overview') return 'account';
  if (pageKey === 'profile') return 'account-settings';
  return pageKey;
}

export function renderModernNavigation(activeKey, root = '../') {
  return dashboardNavGroups.map(({ group, items }) => `
    <div class="nav-group">
      <span class="nav-label">${group}</span>
      ${items.map(([key, label, icon, route]) => `
        <a class="side-link ${key === activeKey ? 'active' : ''}" href="${root}${route}" ${key === activeKey ? 'aria-current="page"' : ''}>
          <span class="side-icon" aria-hidden="true">${icon}</span>${label}
        </a>`).join('')}
    </div>`).join('');
}

export function renderLegacyNavigation(activeKey = 'account', root = './') {
  const account = dashboardNavGroups[0].items;
  const analysis = dashboardNavGroups[1].items;
  const itemMarkup = ([key, label, icon, route]) => `
    <li class="nav-item"><a href="${root}${route}" class="nav-link ${key === activeKey ? 'active' : ''}" ${key === activeKey ? 'aria-current="page"' : ''}>
      <span class="dashboard-nav-icon" aria-hidden="true">${icon}</span> ${label}
    </a></li>`;
  return `${account.map(itemMarkup).join('')}
    <li class="title-nav dashboard-analysis-group">
      <a href="#dashboard-analysis" class="menudropdown nav-link" aria-expanded="false">Live Analysis <i class="fa fa-angle-down" aria-hidden="true"></i></a>
      <ul class="nav flex-column nav-second-level" id="dashboard-analysis">${analysis.map(itemMarkup).join('')}</ul>
    </li>
    <li class="nav-item"><a href="#" class="nav-link" data-logout><span class="dashboard-nav-icon" aria-hidden="true">↩</span> Logout</a></li>`;
}
