# 开发环境搭建
## 1. 下载安装
开发时，需要安装npm和node.js。安装成功后，可以用以下命令查看版本：
```
npm -v
node -v
```
这一步可以参照https://www.electronjs.org/zh/docs/latest/的安装指南。
项目前端使用了electron，需要安装electron。
```
npm install electron
```
如果需要打包，还需要安装electron-builder。
```
npm install electron-builder
```
同时，由于使用了python作为后端数据库操作，需要安装python环境。本项目使用的python库都是标准库，理论上不需要安装额外的库。建议python版本为3.7或以上。最好配置了命令行的环境变量。
## 2.启动项目
在my-electron-app文件夹下运行以下命令即可启动：
```
npm run start   
```
如果需要打包，则运行：
```
npm run build
```
打包后的文件在dist文件夹下。

# 直接使用
如果不需要修改代码，直接下载安装包即可使用。
在release版本下载安装包，解压后运行lazy_ledger.exe即可。

