import { Module } from "vuex";
import { State as RootState } from "@/store";
import { PluginRegistryEntry } from "@/services/plugin";
import Vue from "vue";
import rawLog from "@bksLogger";

const log = rawLog.scope("PluginEntriesModule");

export interface PluginEntriesState {
  officialEntries: PluginRegistryEntry[];
  communityEntries: PluginRegistryEntry[];
  loading: boolean;
}

export const PluginEntriesModule: Module<PluginEntriesState, RootState> = {
  namespaced: true,
  state: {
    officialEntries: [],
    communityEntries: [],
    loading: false,
  },
  mutations: {
    setOfficialEntries(state, entries: PluginRegistryEntry[]) {
      state.officialEntries = entries;
    },
    setCommunityEntries(state, entries: PluginRegistryEntry[]) {
      state.communityEntries = entries;
    },
    setLoading(state, loading: boolean) {
      state.loading = loading;
    },
  },
  getters: {
    all(state) {
      return [...state.officialEntries, ...state.communityEntries];
    },
  },
  actions: {
    async load(context) {
      context.commit("setLoading", true);
      try {
        const { official, community } = await Vue.prototype.$util.send(
          "plugin/entries",
          { clearCache: true }
        );
        context.commit("setOfficialEntries", official);
        context.commit("setCommunityEntries", community);
      } catch (e) {
        log.error(e);
      }
      context.commit("setLoading", false);
    },
  },
};
