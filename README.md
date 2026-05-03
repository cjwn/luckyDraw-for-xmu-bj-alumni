# LuckyDraw for xmu-bj-alumni

厦门大学北京校友会晚宴抽奖网页。

这是一个适用于晚宴现场大屏展示的抽奖页面，支持 16:9 展示、空格键停止抽奖、多轮抽奖配置，以及中奖号码展示。


## 功能

- 16:9 大屏展示
- 按空格键开始/停止抽奖
- 抽奖号码范围：26001 - 26380
- 支持多轮抽奖
- 每轮中奖数量可配置
- 使用 JSON 维护奖项、轮次和中奖人数
- 抽奖后展示中奖号码
- 支持自定义背景图

## 项目结构

```text
.
├── index.html
├── style.css
├── script.js
├── lottery-config.json
├── assets/
│   └── background.png
└── README.md
