export const PKG = 'dsh-conversation-split'

export const CSS = `
.dcs-anchor{width:100%;height:100%;min-height:0;}
.dcs-root{position:fixed;overflow:hidden;isolation:isolate;pointer-events:auto;z-index:5;background:var(--dsw-alias-bg-base,var(--rail-bg,#fff));--dcs-accent:var(--dsw-alias-accent,var(--rail-business,#4d6bfe));--dcs-border:var(--dsw-alias-border,rgba(127,127,127,.28));--dcs-fg:var(--dsw-alias-fg-secondary,inherit);--dcs-hover:var(--dsw-alias-bg-hover,rgba(127,127,127,.12));}
.dcs-root[data-resizing]{user-select:none;cursor:col-resize;}
.dcs-root[data-resizing="column"]{cursor:row-resize;}
.dcs-root[data-resizing] .dcs-pane{pointer-events:none;}
.dcs-pane{position:absolute;display:flex;flex-direction:column;box-sizing:border-box;min-width:0;min-height:0;overflow:hidden;outline:none;border-radius:10px;background:var(--dsw-alias-bg-base,var(--rail-bg,#fff));box-shadow:0 0 0 1px var(--dcs-border);transition:box-shadow 160ms ease;}
.dcs-pane[data-active]{box-shadow:0 0 0 1.5px color-mix(in srgb,var(--dcs-accent) 70%,transparent);}
.dcs-root[data-single] .dcs-pane[data-active]{box-shadow:0 0 0 1px var(--dcs-border);}
.dcs-pane-head{flex:none;display:flex;align-items:center;gap:4px;height:36px;padding:0 6px;box-sizing:border-box;border-bottom:1px solid var(--dcs-border);color:var(--dcs-fg);font-size:13px;}
.dcs-pane-head[data-window-drag]{-webkit-app-region:drag;}
.dcs-pane-head[data-window-drag] button,.dcs-pane-head[data-window-drag] .dcs-title{-webkit-app-region:no-drag;}
/* Antigravity 2.24: narrow panes show their toolbar only while focused or hovered. */
.dcs-pane[data-narrow]:not([data-active]):not(:hover) .dcs-actions{display:none;}
.dcs-pane[data-narrow] .dcs-pane-head{padding:0 2px;gap:0;}
.dcs-pane[data-narrow] .dcs-title{padding:0 4px;}
.dcs-pane[data-tight][data-active] .dcs-title-text,.dcs-pane[data-tight]:hover .dcs-title-text{display:none;}
.dcs-title{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:6px;height:28px;padding:0 8px;border-radius:7px;cursor:grab;user-select:none;background:transparent;border:0;color:inherit;font:inherit;text-align:left;}
.dcs-title:hover{background:var(--dcs-hover);}
.dcs-title:active{cursor:grabbing;}
.dcs-title-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dcs-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dcs-accent);animation:dcs-pulse 1.2s ease-in-out infinite;}
@keyframes dcs-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.dcs-actions{flex:none;display:flex;align-items:center;gap:2px;}
.dcs-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:inherit;cursor:pointer;}
.dcs-btn:hover{background:var(--dcs-hover);}
.dcs-btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
.dcs-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;position:relative;}
.dcs-body>*{flex:1 1 auto;min-height:0;}
.dcs-note{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--dcs-fg);font-size:13px;padding:16px;text-align:center;}
.dcs-note button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid var(--dcs-border);background:transparent;color:inherit;cursor:pointer;}
.dcs-note button:hover{background:var(--dcs-hover);}
.dcs-divider{position:absolute;z-index:2;}
.dcs-divider[data-axis="row"]{cursor:col-resize;}
.dcs-divider[data-axis="column"]{cursor:row-resize;}
.dcs-divider::after{content:"";position:absolute;inset:0;margin:auto;border-radius:2px;background:transparent;transition:background 120ms;}
.dcs-divider[data-axis="row"]::after{width:2px;}
.dcs-divider[data-axis="column"]::after{height:2px;}
.dcs-divider:hover::after,.dcs-divider[data-dragging]::after{background:var(--dcs-accent);}
.dcs-drop{position:absolute;z-index:3;pointer-events:none;border-radius:10px;background:color-mix(in srgb,var(--dcs-accent) 18%,transparent);box-shadow:inset 0 0 0 2px var(--dcs-accent);transition:left 90ms,top 90ms,width 90ms,height 90ms;}
.dcs-menu{position:fixed;z-index:1000;min-width:200px;max-width:320px;padding:4px;border-radius:10px;background:var(--dsw-alias-bg-elevated,var(--rail-bg,#fff));box-shadow:0 0 0 1px var(--dcs-border),0 10px 30px rgba(0,0,0,.18);font-size:13px;}
.dcs-menu-item{display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}
.dcs-menu-item:hover,.dcs-menu-item[data-active]{background:var(--dcs-hover);}
.dcs-menu-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dcs-menu-item kbd{margin-left:auto;opacity:.6;font-size:11px;font-family:inherit;}
.dcs-menu-sep{height:1px;margin:4px 6px;background:var(--dcs-border);}
.dcs-menu-search{box-sizing:border-box;width:100%;margin:2px 0 4px;padding:7px 10px;border:1px solid var(--dcs-border);border-radius:7px;background:transparent;color:inherit;font:inherit;outline:none;}
.dcs-menu-list{max-height:320px;overflow:auto;}
.dcs-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:1001;padding:8px 14px;border-radius:8px;background:rgba(20,20,20,.9);color:#fff;font-size:13px;pointer-events:none;}
`
