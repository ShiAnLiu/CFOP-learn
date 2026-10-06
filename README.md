# CFOP 公式闯关 · OLL / PLL 可视化学习器

一个纯前端（three.js）的 CFOP 公式学习器：**公式全部用图形表示，不出现任何 `R`、`R'`、`U2` 之类的字母记号**。

## 🌐 在线访问（GitHub Pages）

> 开启 Pages 后地址为：**https://shianliu.github.io/CFOP-learn/**

开启方式（只需一次）：仓库 **Settings → Pages → Build and deployment**
- Source 选 **Deploy from a branch**
- Branch 选 **`main`** ，目录选 **`/ (root)`**，Save
- 等约 1 分钟即可访问

本项目是纯静态站点（无构建步骤）：`index.html` + `src/` + `vendor/`（three.js 已本地化），
仓库根目录的 `.nojekyll` 用来关闭 Jekyll 处理。所有资源引用都是相对路径，因此在
`/CFOP-learn/` 这种子路径下也能正常工作。

## 本地启动

```bash
npm install          # 只有重新生成公式数据 / 跑测试才需要
npm start            # 启动本地服务器
# 浏览器打开  http://localhost:5173
```

> 也可以直接 `node server.mjs`，端口用环境变量 `PORT` 覆盖。

## 功能

| 模块 | 说明 |
| --- | --- |
| 🗺️ 闯关学习 | OLL 按形状分成 12 关（十字 / 鱼形 / 闪电形 / 点形…），PLL 分成 4 关。先看 3D 演示学公式，再进入测验。 |
| 🎬 3D 演示 | 学习页分两段：**① 打乱公式**（在复原的魔方上做，拧成该公式对应的局面）+ **② 复原公式**，3D 连续演示打乱→复原。可拖动旋转视角、滚轮缩放；支持播放/暂停/单步前进后退/调速，点任意一步可跳转。 |
| 📝 测验 | 三种题型：①看局面选公式 ②看公式选局面 ③补全公式中缺失的一步。正确率 ≥80% 通关并解锁下一关。 |
| 🔁 每日复习 | 类似 Leitner / 间隔重复：答对间隔 1→2→4→7→15→30→60 天，答错重置，每天推送到期公式。 |
| ⚔️ 实战练习 | 给出一个打乱公式（图形），直接打乱到 **十字 + F2L 已完成** 的状态，限时判断这是哪个 OLL/PLL；可一键演示完整解法（含 AUF）。 |
| 📚 公式库 | 浏览全部 57 个 OLL + 21 个 PLL 的 3D 演示与顶面图案。 |

## 图形公式怎么读

* **色块颜色 = 要转的面**：顶黄、底白、前绿、后蓝、右红、左橙。
* **箭头方向 = 转动方向**：正向弧线箭头 = 顺时针，反向箭头 = 逆时针，双向箭头 = 转 180°。
* **外框 = 两层一起转**（宽层转），**上下 / 左右拼色 = 中间层**（M / E / S），**深色圆环 = 整体转向**（x / y / z）。

## 目录结构

```
index.html          页面入口 + importmap
server.mjs          本地静态服务器
vendor/             three.js（本地化，无需联网）
src/
  data.js           78 条公式（SpeedCubeDB 数据，已清洗并校验）
  cube.js           精确的 26 块魔方模型（整数运算，永不漂移）
  cases.js          公式目录、关卡划分、图案缓存
  visuals.js        把一步棋画成图形芯片（SVG）
  diagram.js        顶面图案（OLL/PLL 识别图）
  quiz.js           题目生成（三种题型）
  renderer.js       three.js 3D 魔方 + 动画
  app.js            UI / 路由 / 进度
tools/
  build-data.mjs    从 @moishy/algsets 重新生成 src/data.js（含 F2L 校验）
  test-*.mjs        逻辑自测（npm test）
  dev-driver.mjs    用无头 Chrome 做端到端冒烟测试（开发用）
```

## 数据可靠性

* 每条公式都由 `tools/build-data.mjs` 自动校验：把公式逆序打到复原魔方上，得到的局面必须保持**底部两层（十字 + F2L）完全复原**。
* `npm test` 还会验证：78 条公式打完后都能回到复原状态；实战打乱（含 4 种 AUF）后的局面均满足「十字 + F2L 已完成」；PLL 解法都能在收尾 AUF 后完全复原；每种题型的四个选项里恰好只有一个正确答案。

学习进度保存在浏览器 `localStorage`。
