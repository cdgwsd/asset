# TODO.md — 后续开发任务

## P0 — 必须优先修复

### P0-1: 关闭开发环境 PWA Service Worker
- **状态**: ✅ done
- **文件**: `vite.config.ts`
- **说明**: `devOptions.enabled: true` 导致开发环境启用 SW，容易缓存旧代码
- **方案**: 改为 `false`
- **风险**: 极低
- **验收**: `npm run dev` 后无活跃 SW

### P0-2: 清理冗余的添加账户流程
- **状态**: ✅ done
- **文件**: `AccountFormSheet.vue`, `AddAccountSheet.vue`, `Home.vue`
- **说明**: 两套添加流程并存，维护负担大。保留 AddAccountSheet，简化 AccountFormSheet 为仅编辑模式
- **风险**: 中等，需确认所有调用路径
- **验收**: 加号→类型选择→添加表单流程完整；编辑功能不受影响

### P0-3: 移除"更多选项"空壳按钮
- **状态**: ✅ done
- **文件**: `AddAccountSheet.vue`
- **说明**: 点击只弹"暂未开放"，给用户不完整感觉
- **方案**: 直接移除该按钮
- **风险**: 极低
- **验收**: 添加账户表单中无"更多选项"按钮

---

## P1 — 核心体验优化

### P1-1: 弹窗关闭动画
- **状态**: ✅ done
- **文件**: `BottomSheet.vue`, `global.css`
- **说明**: 弹窗关闭时直接消失，需要添加 `sheet-out` / `overlay-out` 动画
- **风险**: 中等，所有弹窗受影响
- **验收**: 所有弹窗关闭时有平滑下滑消失动画

### P1-2: 键盘弹起时页面稳定性
- **状态**: ✅ done
- **文件**: `main.ts`, `global.css`
- **说明**: iOS Safari 键盘弹起时视口变化可能导致布局跳动
- **风险**: 中等，需多设备验证
- **验收**: 输入框聚焦/失焦时无明显跳动

### P1-3: scrollLock 方案改进
- **状态**: ✅ done
- **文件**: `scrollLock.ts`
- **说明**: `position: fixed` 方案可能导致弹窗开闭时闪烁
- **风险**: 中等
- **验收**: 弹窗开闭时背景页面无闪烁

### P1-4: safe-area 全面检查
- **状态**: ✅ done (CSS 已全面覆盖)
- **文件**: 所有弹窗组件, `global.css`
- **说明**: 核查所有底部元素的 safe-area 适配
- **风险**: 低
- **验收**: iPhone 上底部元素不被横条遮挡

---

## P2 — 视觉和交互优化

### P2-1: ECharts 体积优化
- **状态**: ✅ done (已通过 async import + tree-shaking 最小化，514KB 为 ECharts 核心下限)
- **文件**: `TrendSheet.vue`
- **说明**: ECharts 约 300KB+，考虑更轻量方案或确保独立 chunk
- **风险**: 中等
- **验收**: 图表代码在独立 chunk，首屏加载不受影响

### P2-2: 样式文件拆分
- **状态**: ✅ done (阶段一)
- **文件**: `global.css`, 各 Vue 组件
- **说明**: 1124 行全局样式逐步迁移到 scoped style
- **风险**: 低，工作量大需分批
- **验收**: global.css 缩减到约 200 行

### P2-3: 余额输入千分位显示
- **状态**: ✅ done
- **文件**: `UpdateBalanceSheet.vue`, `AddAccountSheet.vue`, `AccountFormSheet.vue`
- **说明**: 输入大数字时显示千分位分隔
- **风险**: 低
- **验收**: 余额输入框数字按千分位显示

### P2-4: 首页视觉层级优化
- **状态**: ✅ done
- **文件**: `Home.vue`, `NetAssetCard.vue`, `SummaryMiniBar.vue`
- **说明**: 总资产/总负债/净资产关系不够直观
- **风险**: 低
- **验收**: 三个金额之间关系一目了然

---

## P3 — 后续增强能力

### P3-1: 趋势图功能增强
- **状态**: ✅ done
- **文件**: `TrendSheet.vue`, `trendService.ts`
- **说明**: 增加数据标签、涨跌提示、点击详情
- **风险**: 低
- **验收**: 趋势图显示起始→终止变化，含涨跌金额和百分比

### P3-2: 数据导出格式增强
- **状态**: ✅ done
- **文件**: `backupService.ts`, `SettingsSheet.vue`
- **说明**: 支持导出快照 CSV、指定时间范围
- **风险**: 低
- **验收**: 可导出快照 CSV，可选时间范围

### P3-3: 更多账户类型支持
- **状态**: ✅ done
- **文件**: `accountTypeChoices.ts`, `defaults.ts`
- **说明**: 支持用户自定义账户类型
- **风险**: 中，涉及数据模型扩展
- **验收**: 用户可创建自定义类型，不影响已有数据

### P3-4: 数据备份提醒
- **状态**: ✅ done
- **文件**: `backupService.ts`, `SettingsSheet.vue`
- **说明**: 超过 30 天未导出时显示提醒
- **风险**: 低
- **验收**: 设置页在超期时显示备份提醒
