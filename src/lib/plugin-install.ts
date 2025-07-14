export const installPlugins = async (plugins: string[]) => {
  for (const plugin of plugins) {
    await import(`./plugins/thirdParty/${plugin}`);
  }
};
