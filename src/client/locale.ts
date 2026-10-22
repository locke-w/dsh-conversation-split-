import type { ClientContext } from '../dsh-types.d.ts'

export const NS = 'dsh-conversation-split'

const en = {
  'header.split': 'Split conversation',
  'menu.splitRight': 'Split right',
  'menu.splitDown': 'Split down',
  'menu.openInSplit': 'Open in split view',
  'pane.untitled': 'New conversation',
  'pane.empty': 'Pick a conversation for this pane',
  'pane.opening': 'Opening…',
  'pane.failed': 'This conversation could not be opened.',
  'pane.retry': 'Retry',
  'pane.maximize': 'Maximize pane',
  'pane.restore': 'Restore panes',
  'pane.close': 'Close pane',
  'pane.sidebar': 'Toggle right sidebar',
  'pane.splitRight': 'Split right',
  'pane.splitDown': 'Split down',
  'pane.newBeside': 'New conversation here',
  'pane.switch': 'Switch conversation',
  'pane.running': 'Running',
  'picker.title': 'Conversations',
  'picker.search': 'Search conversations…',
  'picker.new': 'New conversation',
  'picker.none': 'No conversations',
  'toast.paneLimit': 'At most {max} panes can be open.',
  'toast.createFailed': 'Could not create a conversation.',
  'shortcut.splitRight': 'Split view: split right',
  'shortcut.splitDown': 'Split view: split down',
  'shortcut.close': 'Split view: close pane',
  'shortcut.zoom': 'Split view: maximize / restore pane',
  'shortcut.next': 'Split view: focus next pane',
  'shortcut.previous': 'Split view: focus previous pane',
  'shortcut.left': 'Split view: focus pane to the left',
  'shortcut.right': 'Split view: focus pane to the right',
  'shortcut.up': 'Split view: focus pane above',
  'shortcut.down': 'Split view: focus pane below',
}

const zh: Record<keyof typeof en, string> = {
  'header.split': '分屏对话',
  'menu.splitRight': '向右分屏',
  'menu.splitDown': '向下分屏',
  'menu.openInSplit': '在分屏中打开',
  'pane.untitled': '新对话',
  'pane.empty': '为这个面板选择一个对话',
  'pane.opening': '正在打开…',
  'pane.failed': '无法打开这个对话。',
  'pane.retry': '重试',
  'pane.maximize': '最大化面板',
  'pane.restore': '还原面板',
  'pane.close': '关闭面板',
  'pane.sidebar': '切换右侧边栏',
  'pane.splitRight': '向右分屏',
  'pane.splitDown': '向下分屏',
  'pane.newBeside': '在此新建对话',
  'pane.switch': '切换对话',
  'pane.running': '运行中',
  'picker.title': '对话列表',
  'picker.search': '搜索对话…',
  'picker.new': '新建对话',
  'picker.none': '暂无对话',
  'toast.paneLimit': '最多只能打开 {max} 个面板。',
  'toast.createFailed': '无法创建对话。',
  'shortcut.splitRight': '分屏：向右分屏',
  'shortcut.splitDown': '分屏：向下分屏',
  'shortcut.close': '分屏：关闭面板',
  'shortcut.zoom': '分屏：最大化 / 还原面板',
  'shortcut.next': '分屏：聚焦下一个面板',
  'shortcut.previous': '分屏：聚焦上一个面板',
  'shortcut.left': '分屏：聚焦左侧面板',
  'shortcut.right': '分屏：聚焦右侧面板',
  'shortcut.up': '分屏：聚焦上方面板',
  'shortcut.down': '分屏：聚焦下方面板',
}

export type MessageKey = keyof typeof en
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

export function registerLocale(ctx: ClientContext) {
  return ctx.locale.register(NS, { zh, en })
}

/** Fallback translator used when the host locale service hands back the raw key. */
export function bindTranslate(ctx: ClientContext): Translate {
  const bound = ctx.locale.bind(NS)
  const lang = typeof navigator === 'undefined' ? 'en' : navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  return (key, params) => {
    let text = bound(key, params)
    if (text === key || text === `${NS}:${key}` || text === '') text = (lang === 'zh' ? zh : en)[key]
    if (params !== undefined) for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v))
    return text
  }
}
