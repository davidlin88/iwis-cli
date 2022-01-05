# iwis-cli

这是一个前端工程化的学习向的项目：从基础到复杂，逐步构建一个脚手架。

项目参照了 vue-cli 等，此项目迭代是一个边实现、边总结的过程，会在代码注释中加入自己的理解和疑问

## 使用方法

```bash
npm install -g @iwis/cli
iwis create my-project
```

## 贡献方法

贡献需要使用 yarn，因为本项目的 monorepo 架构依赖于[yarn workspace](https://classic.yarnpkg.com/blog/2017/08/02/introducing-workspaces/)与[lerna](https://www.lernajs.cn/)，
其中 yarn 用于管理 package 依赖、lerna 用于版本管理与发布 publish。

1. fork 本项目至你的 github
2. git clone 你的仓库
3. `yarn`
4. `git checkout -b <new-branch-name>`：在新分支上修改代码
5. `cd packages/@iwis/cli`
6. `yarn link`：将脚手架命令链接到本地全局环境
7. 本地测试完成后发起一个 Pull Request
8. 等待 Code Review 通过后 merge
9. 贡献成功~

## 升级计划

- [x] 支持选择 yarn/npm
- [x] 支持切换源为淘宝源
- [x] 改为 monorepo 架构
- [x] 支持 git commit eslint/prettier 校验
- [x] 支持 git commit message 格式校验
- [ ] 支持动态生成 webpack 配置
- [ ] 升级至 ESM
- [ ] 替换 webpack 为 vite
- [ ] ...
