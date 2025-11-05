# Kindle Todo - 专为电子墨水屏优化的待办事项应用

一个极简主义的每日任务规划器，为 Kindle、Kobo 等电子阅读器的网页浏览器特别优化。

## ✨ 主要特性

- **为电子墨水屏设计**：轻量、快速、高对比度的界面，最大程度减少闪烁和动画，提供舒适的阅读和使用体验。
- **纯前端，数据本地存储**：所有任务数据都安全地存储在您浏览器的 `localStorage` 中，无需注册或登录。
- **每日任务管理**：轻松添加、完成和删除当天的任务。
- **昨日未完成任务自动顺延**：前一天未完成的任务会自动出现在今天的列表中，确保您不会遗忘任何重要事项。
- **任务进度条**：直观地看到今天任务的完成进度。
- **深色/浅色模式切换**：一键切换主题，适应不同光线环境。
- **任务导出**：可以将当天的任务列表导出为 `.txt` 文件，方便备份和存档。
- **自动清理**：超过30天的旧任务记录会自动清除，保持应用轻巧。

## 🛠️ 技术栈

- **前端**：原生 HTML, CSS, 和 JavaScript，无任何框架依赖。
- **后端 (Serverless)**：通过 **Cloudflare Functions** 实现任务导出功能。
- **托管平台**：**Cloudflare Pages**。

## 🚀 部署指南

本项目已完全适配 Cloudflare Pages，您可以轻松地一键部署，拥有自己的在线待办事项应用。

1.  **Fork/克隆仓库**
    *   访问此项目的 GitHub 仓库：[https://github.com/cityisempty/kindleTodo.git](https://github.com/cityisempty/kindleTodo.git)
    *   点击 "Fork" 按钮，将此仓库复制到您自己的 GitHub 账户下。

2.  **登录 Cloudflare**
    *   登录到您的 [Cloudflare 仪表板](https://dash.cloudflare.com/)。
    *   在导航栏中，转到 **Workers & Pages**。

3.  **创建 Pages 项目**
    *   点击 **Create application** > **Pages** > **Connect to Git**。
    *   选择您刚刚 Fork 的项目仓库并授权。

4.  **配置构建设置**
    *   在 **Build settings** 步骤中，Cloudflare 通常会自动识别，但请确保配置如下：
        *   **Framework preset**：选择 `None`。
        *   **Build command**：留空。
        *   **Build output directory**：设置为 `/` (或 `(root)`)。
    *   点击 **Save and Deploy**。

部署将在几分钟内完成。之后，您就可以通过 Cloudflare 提供的域名访问您的 Kindle Todo 应用了！

## 使用方法

1.  在您的电子阅读器（如 Kindle）的“体验版网页浏览器”中，访问您的部署域名。
2.  在顶部的输入框中添加新任务。
3.  点击任务文本或复选框来标记任务为完成。
4.  使用任务右侧的 `×` 按钮删除任务。
5.  点击右上角的图标切换深色/浅色模式。
6.  点击“导出”按钮将任务保存为文本文件。
