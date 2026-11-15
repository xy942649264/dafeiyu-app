大肥鱼 iOS v1.3.1 —— 构建说明

【结论先说】
iOS 的安装包（.ipa）必须在 macOS + Xcode 上构建并签名，
Windows 上没有任何工具能打出能装进 iPhone 的 ipa。这不是能力问题，是苹果的限制。

【方式一：有 Mac（最快，10 分钟）】
1. 把这整个 ios 目录拷到 Mac
2. brew install cocoapods && cd ios/App && pod install
3. 双击 ios/App/App.xcworkspace 打开 Xcode
4. Xcode → Signing & Capabilities → 选你的 Apple ID 团队（免费账号 7 天有效）
5. 手机连上 Mac → 顶部选你的设备 → 点 Run（装到手机）
   或者：Product → Archive → Distribute App → 导出 ipa

【方式二：无 Mac，用 GitHub Actions 云构建】
1. 把整个 dafish-app 目录推到 GitHub 私有仓库
2. 仓库里已带 .github/workflows/ios.yml（我写好了）
3. Actions 里点 Run workflow → 跑完在 Artifacts 下载 App.ipa
4. 无签名证书的情况下产物是「未签名 ipa」，装真机仍需：
   - 免费 Apple ID 用 Sideloadly/AltStore 自签（7 天要重签一次），或
   - 付费开发者账号（$99/年）+ 证书，正式分发

【方式三：现在就能用（不需要任何构建）】
iPhone 用 Safari 打开 https://yu.nianhua520.cn:18443
→ 分享 → 添加到主屏幕 → 桌面出现「大肥鱼」图标，全屏无地址栏
这就是 PWA，功能与 App 完全一样（麦克风/摄像头首次点一下授权即可）。
