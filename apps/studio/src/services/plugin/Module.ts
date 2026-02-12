import { PluginManager } from "@/services/plugin";

export abstract class Module {
  manager: PluginManager;

  constructor(options: { manager: PluginManager }) {
    this.manager = options.manager;
  }

  async beforeInitialize() { }
}

export type ModuleClass = new (options: { manager: PluginManager }) => Module;
