---
title: "最终项目：多线程 Web 服务器"
order: "ch21-00-final-project-a-web-server"
chapter: 21
---
手写一个返回页面的 HTTP 服务器，再加上固定大小的线程池。本章不用 `async` / `await`；异步运行时内部也常用线程池调度任务。生产环境用现成 crate，这里把每步的规则写清楚。

1. TCP 与 HTTP 的分工。
2. 在套接字上监听 TCP。
3. 解析少量 HTTP 请求。
4. 构造 HTTP 响应。
5. 用线程池提高吞吐。
