# 本地私用背景音乐

如果你只在本机自己玩，可以把你自己已有的音乐文件放在本目录，并命名为：

- `private-bgm.mp3`
- 或 `private-bgm.wav`

游戏会优先播放 `private-bgm.mp3`，其次播放 `private-bgm.wav`，都不存在时才播放默认原创音乐 `changban-drum-loop.wav`。

`private-bgm.*` 已加入 `.gitignore`，并且构建脚本会从 `dist` 中删除它，避免误发布。
