import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ORIGINAL_NAVIGATION, OriginalAppShellView, type OriginalAppShellViewProps } from '../src/components/OriginalAppShell';
import { MODULES } from '../src/erpMetadata';

const noop = () => {};
const defaults: OriginalAppShellViewProps = {
  activeModule: 'dashboard', profile: { uid: 'owner-test', name: 'Russi', role: 'OWNER', companyId: 'company-a', branchId: 'branch-a' },
  brandLogo: '/logo-test.png', onNavigate: noop, onLogout: noop, onOpenApplications: noop,
  theme: 'light', onToggleTheme: noop, mobileOpen: false, onToggleMobile: noop,
  search: '', onSearchChange: noop, children: <p>Secure workspace sentinel</p>,
};
const render = (overrides: Partial<OriginalAppShellViewProps> = {}) => renderToStaticMarkup(<OriginalAppShellView {...defaults} {...overrides} />);
function elements(node: React.ReactNode): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return [];
  return [node, ...elements(node.props.children)];
}

test('original shell restores brand, sidebar sections, watermark and cream/gold identity', () => {
  const html = render();
  for (const value of ['data-design="original"', 'data-theme="light"', 'original-design theme-light', 'erp-sidebar-desktop', 'erp-view-container-workspace', 'Talk of the Town Logo', 'TALK OF THE TOWN', 'CRICKET CLOSET', 'Operations', 'Commerce &amp; Finance', 'Security &amp; Customisation', 'Dashboard Cockpit', 'Secure workspace sentinel']) assert.ok(html.includes(value), value);
  assert.match(html, /bg-\[#E5B84B\]/);
  assert.match(html, /Skip to workspace/);
});

test('shell uses only actual authenticated role/company/branch, not legacy demo branches/claims', () => {
  const html = render();
  assert.match(html, /company-a/); assert.match(html, /branch-a/); assert.match(html, /Russi · OWNER/);
  assert.match(html, /SERVER-AUTHORIZED SCOPE/); assert.match(html, /No client-side branch switch/);
  assert.doesNotMatch(html, /Melbourne|London|v4\.2|IndexedDB|Cloud Production Active|● ACTIVE|Verified Claims|100%/);
  assert.doesNotMatch(html, /<select/);
});

test('all active secure modules remain reachable in restored sidebar', () => {
  assert.deepEqual(ORIGINAL_NAVIGATION.map(item => item.id).sort(), Object.keys(MODULES).sort());
  const html = render({ activeModule: 'inventory' });
  assert.match(html, /aria-current="page"[^>]*>[\s\S]*?Inventory Stock/);
  for (const item of ORIGINAL_NAVIGATION) assert.ok(render().includes(item.label.replaceAll('&', '&amp;')), item.id);
});

test('mobile navigation expanded and collapsed markup has accurate controls', () => {
  const closed = render();
  assert.match(closed, /aria-expanded="false"/); assert.doesNotMatch(closed, /id="original-mobile-navigation"/);
  const open = render({ mobileOpen: true });
  assert.match(open, /aria-expanded="true"/); assert.match(open, /id="original-mobile-navigation"/);
  assert.match(open, /aria-label="Mobile ERP navigation"/); assert.match(open, /Close navigation/);
});

test('dark theme and light theme toggles are labelled without changing role/scope', () => {
  const light = render(); const dark = render({ theme: 'dark' });
  assert.match(light, /Use dark theme/); assert.match(dark, /Use light theme/);
  assert.match(dark, /data-theme="dark"/); assert.doesNotMatch(dark, /theme-light/);
  for (const html of [light, dark]) { assert.match(html, /company-a/); assert.match(html, /branch-a/); assert.match(html, /OWNER/); }
});

test('header search is explicitly module navigation, not invented record search', () => {
  const html = render({ search: 'suppliers' });
  const start = html.indexOf('aria-label="Matching workspaces"');
  const results = html.slice(start, html.indexOf('</div>', start));
  assert.match(results, /Workspace navigation · not record search/);
  assert.match(results, /Purchasing &amp; Suppliers/); assert.doesNotMatch(results, /Dashboard Cockpit/);
  assert.match(render({ search: 'definitely-missing' }), /No matching workspaces/);
  assert.doesNotMatch(render(), /aria-label="Matching workspaces"/);
});

test('controlled shell buttons delegate navigation, logout, theme and launcher actions', () => {
  const visited: string[] = []; let logout = 0, theme = 0, launcher = 0, mobile = 0;
  const tree = OriginalAppShellView({ ...defaults, onNavigate: id => visited.push(id), onLogout: () => logout++, onToggleTheme: () => theme++, onOpenApplications: () => launcher++, onToggleMobile: () => mobile++ });
  const buttons = elements(tree).filter(node => node.type === 'button');
  buttons.find(node => node.props['aria-label'] === 'Open applications')!.props.onClick();
  buttons.find(node => node.props['aria-label'] === 'Use dark theme')!.props.onClick();
  buttons.find(node => node.props['aria-label'] === 'Open navigation')!.props.onClick();
  buttons.find(node => node.props['aria-label'] === 'Open notifications and audit')!.props.onClick();
  buttons.find(node => renderToStaticMarkup(node).includes('Sign out / switch account'))!.props.onClick();
  assert.equal(launcher, 1); assert.equal(theme, 1); assert.equal(mobile, 1); assert.equal(logout, 1); assert.deepEqual(visited, ['notifications']);
});

test('missing profile remains unknown, never defaults to OWNER or fake scope', () => {
  const html = render({ profile: null });
  assert.match(html, /Scope unavailable/); assert.match(html, /Company Unavailable/);
  assert.doesNotMatch(html, /OWNER|branch-a|company-a|Melbourne|London/);
});

test('restoration preserves session boundary/scope remount and server command wiring', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<SessionBoundary/);
  assert.match(app, /key=\{`\$\{profile\?\.uid\}:\$\{profile\?\.companyId\}:\$\{profile\?\.branchId\}:\$\{profile\?\.role\}`\}/);
  assert.match(app, /<OriginalAppShell/); assert.match(app, /<OriginalDashboard/); assert.match(app, /<DesignedEntityWorkspace/);
  assert.match(app, /<CustomersWorkspace/); assert.match(app, /<ERPCommandForm/); assert.match(app, /<OdooFormModal/);
  assert.match(app, /result\.replayed/); assert.match(app, /setRevision\(value => value \+ 1\)/);
  for (const filename of ['App.tsx', 'components/OriginalAppShell.tsx', 'components/OriginalDashboard.tsx', 'components/DesignedEntityWorkspace.tsx']) {
    const source = readFileSync(new URL(`../src/${filename}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*legacy-ui|localStorage|indexedDB|addDoc\(|setDoc\(|updateDoc\(|deleteDoc\(/);
  }
});
