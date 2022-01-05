module.exports = class PromptModuleAPI {
  constructor(creator) {
    this.creator = creator
  }
  // 暴露给feature以将其插入到交互选项中
  injectFeature(feature) {
    this.creator.featurePrompt.choices.push(feature)
  }
  injectPrompt(prompt) {
    this.creator.injectedPrompts.push(prompt)
  }
}
