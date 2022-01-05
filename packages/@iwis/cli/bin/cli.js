#! /usr/bin/env node

const { program } = require('commander')
const create = require('../lib/create.js')
const add = require('../lib/add')

program
  .version('1.0.0')
  .command('create <name>')
  .description('创建一个新项目')
  .action(name => {
    create(name)
  })

program
  .command('add <name>')
  .description('添加一个插件')
  .action(name => {
    add(name)
  })

program.parse()
