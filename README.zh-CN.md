# dsh-conversation-split

[English](./README.md)

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）桌面端 / Web 端提供 **Antigravity 风格的对话分屏**：在同一个窗口里左右并排或上下堆叠显示多个会话，每个面板都有自己的实时聊天、输入框和流式输出。

这是一个纯客户端插件：每个面板直接复用 DSH 官方的会话渲染器（不用 iframe、不开第二个应用实例、不复制聊天 UI），因此权限确认、工具调用、附件、会话状态等行为与普通单会话视图完全一致。

## 功能

- 从会话标题栏按钮、面板工具栏、侧边栏会话菜单或快捷键发起「向右分屏 / 向下分屏」。
- 最多 8 个面板，嵌套二叉布局，可拖动分隔条调整比例。
- 每个面板的标题栏：切换会话（可搜索）、新建会话、分屏、最大化 / 还原、关闭；右键标题栏打开完整操作菜单。
- 拖动面板标题到另一个面板的左 / 右 / 上 / 下半区即可移动面板；菜单中可交换两个面板。
- 复刻 Antigravity 2.24 行为：窄面板只在获得焦点或鼠标悬停时显示工具栏。
- 点击即聚焦；右侧边栏（文件、终端等）跟随当前聚焦面板的会话。
- 布局保存在 `localStorage`；会话被删除 / 归档后对应面板变为空面板而不是悬空引用。
- 跟随宿主语言提供中英文界面。
- 修饰键跟随平台：macOS 用 ⌘，Windows / Linux 用 Ctrl。

## 快捷键

| 操作 | macOS | Windows / Linux |
| --- | --- | --- |
| 向右分屏 | ⇧⌘D | Ctrl+Shift+D |
| 向下分屏 | ⇧⌘E | Ctrl+Shift+E |
| 关闭面板 | ⇧⌘W | Ctrl+Shift+W |
| 最大化 / 还原 | ⇧⌘↵ | Ctrl+Shift+Enter |
| 下一个 / 上一个面板 | ⇧⌘] / ⇧⌘[ | Ctrl+Shift+] / Ctrl+Shift+[ |
| 聚焦左 / 右 / 上 / 下面板 | ⌥⌘ 方向键 | Ctrl+Alt+方向键 |

这些命令注册到 DSH 的快捷键服务，会出现在 **设置 → 快捷键** 中并可重新绑定。若宿主拒绝某个组合（DSH Web 保留了很多浏览器快捷键，Linux 上尤其多），插件会退回到同样默认键位的页面级监听。

## 安装

需要 DSH `0.2.x`（基于 `@deepseek-ai/dsh@0.2.1-rc.2` 开发和测试）。插件安装在 DSH 的 *profile* 中：桌面端使用 `desktop`，`dsh web` 使用 `web`。

```bash
# 从 npm 安装（发布后）……
dsh plugin --profile desktop add dsh-conversation-split

# ……或从本地源码安装
git clone https://github.com/locke-w/dsh-conversation-split-
cd dsh-conversation-split && npm install && npm run build && npm pack
dsh plugin --profile desktop add ./dsh-conversation-split-0.1.0.tgz
```

之后重启 DSH Desktop（或 `dsh web`）。若 `dsh` 不在 PATH 中，可用 `npx -y @deepseek-ai/dsh@0.2.1-rc.2 plugin …`。

卸载：`dsh plugin --profile desktop remove dsh-conversation-split`。

## 平台支持与验证状态

- **目标平台**：DSH Desktop 的 macOS（Apple Silicon / Intel）与 Windows x64——即 DSH Desktop 自身发布的平台——以及任意桌面浏览器中的 `dsh web`。
- **已验证**：Linux 上 Chromium 中的 `dsh web` 0.2.1-rc.2（分屏、各面板独立输入与发送、会话选择器、最大化、关闭、拖动调整、拖拽移动、标题栏按钮、侧边栏跟随、多语言、快捷键回退）。侧边栏会话菜单项与「设置 → 快捷键」注册已实现但尚未在该环境中实际验证。macOS / Windows 的原生 Electron 包**尚未**实际运行验证；插件只使用官方客户端插件 API 并按平台区分修饰键，若在桌面端遇到差异请提 issue。

## 实现原理

- 以优先级 `-1` 注册一个 `main.conversation` 槽位条目，在分屏激活时遮蔽宿主的单会话视图，只渲染一个占位盒。
- 一个根作用域的 `shell.overlay` 条目把各面板定位到占位盒上。每个面板通过 `ctx.sessions` 持有（retain）自己的会话，用官方 `SessionProvider` 包裹，并以 `variant: 'embedded'` 渲染 `conversation.content`——与宿主使用的是同一个组件。
- 布局是一个带单元测试的小型不可变二叉树（`src/layout/tree.ts`），其余是建立在 DSH 槽位工具之上的 React 代码。

## 开发

```bash
npm install
npm test          # 布局树与存储测试
npm run typecheck
npm run build     # lib/index.js（宿主侧，空实现）+ lib/client.js（浏览器模块）
```

## 已知限制

- 所有面板共用宿主唯一的右侧边栏，它跟随聚焦面板。
- Linux 上的 `dsh web` 无法向宿主快捷键服务注册 `Ctrl+Shift+字母`，因此这些键位不会出现在「设置 → 快捷键」中（回退监听仍然生效）。
- 这不是 `/fork` 或 `/branch`：面板展示的是已有会话，不会复制历史。

MIT © locke-w
