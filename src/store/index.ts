import {
    createStore,
    useStore as baseUseStore,
    MutationTree,
    Store,
} from "vuex";
import createPersistedState from "vuex-persistedstate";
import { InjectionKey } from "vue";

import type { SimplifiedPlaylist } from "../types/SpotifyObjects";

export interface State {
    accessToken: string | null;
    refreshToken: string | null;
    expiresIn: number | null;
    expirationStart: number | null;
    playlists: SimplifiedPlaylist[] | null;
}

export const key: InjectionKey<Store<State>> = Symbol();
export function useStore() {
    return baseUseStore(key);
}

enum MutationNames {
    SET_ACCESS_TOKEN = "SET_ACCESS_TOKEN",
    SET_REFRESH_TOKEN = "SET_REFRESH_TOKEN",
    SET_EXPIRES_IN = "SET_EXPIRES_IN",
    SET_EXPIRATION_START = "SET_EXPIRATION_START",
    SET_PLAYLISTS = "SET_PLAYLISTS",
    UPDATE_PLAYLISTS = "UPDATE_PLAYLISTS",
}

type MutationTypes<S = State> = {
    [MutationNames.SET_ACCESS_TOKEN](state: S, accessToken: string): void;
    [MutationNames.SET_REFRESH_TOKEN](state: S, refreshToken: string): void;
    [MutationNames.SET_EXPIRES_IN](state: S, expiresIn: number): void;
    [MutationNames.SET_EXPIRATION_START](
        state: S,
        expirationStart: number
    ): void;
    [MutationNames.SET_PLAYLISTS](
        state: S,
        playlists: SimplifiedPlaylist[] | null
    ): void;
    [MutationNames.UPDATE_PLAYLISTS](
        state: S,
        playlists: SimplifiedPlaylist[]
    ): void;
};

interface SpotifyCredentials {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

interface SpotifyRefreshTokenCredentials {
    accessToken: string;
    expiresIn: number;
}

const mutations: MutationTree<State> & MutationTypes = {
    [MutationNames.SET_ACCESS_TOKEN](state: State, accessToken: string) {
        state.accessToken = accessToken;
    },
    [MutationNames.SET_REFRESH_TOKEN](state: State, refreshToken: string) {
        state.refreshToken = refreshToken;
    },
    [MutationNames.SET_EXPIRES_IN](state: State, expiresIn: number) {
        state.expiresIn = expiresIn;
    },
    [MutationNames.SET_EXPIRATION_START](
        state: State,
        expirationStart: number
    ) {
        state.expirationStart = expirationStart;
    },
    [MutationNames.SET_PLAYLISTS](
        state: State,
        playlists: SimplifiedPlaylist[] | null
    ) {
        state.playlists = playlists;
    },
    [MutationNames.UPDATE_PLAYLISTS](
        state: State,
        playlists: SimplifiedPlaylist[]
    ) {
        if (state.playlists) {
            state.playlists = state.playlists.concat(playlists);
        }
    },
};

const store = createStore<State>({
    state: {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        expirationStart: null,
        playlists: null,
    },
    mutations,
    actions: {
        setSpotifyCredentials({ commit }, credentials: SpotifyCredentials) {
            commit(MutationNames.SET_ACCESS_TOKEN, credentials.accessToken);
            commit(MutationNames.SET_REFRESH_TOKEN, credentials.refreshToken);
            commit(MutationNames.SET_EXPIRES_IN, credentials.expiresIn);
            commit(MutationNames.SET_EXPIRATION_START, new Date().getTime());
        },
        updateSpotifyTokens({ commit }, token: SpotifyRefreshTokenCredentials) {
            commit(MutationNames.SET_ACCESS_TOKEN, token.accessToken);
            commit(MutationNames.SET_EXPIRES_IN, token.expiresIn);
            commit(MutationNames.SET_EXPIRATION_START, new Date().getTime());
        },
        clearSpotifyData({ commit }) {
            commit(MutationNames.SET_ACCESS_TOKEN, null);
            commit(MutationNames.SET_REFRESH_TOKEN, null);
            commit(MutationNames.SET_EXPIRES_IN, null);
            commit(MutationNames.SET_EXPIRATION_START, null);
            commit(MutationNames.SET_PLAYLISTS, null);
        },
        setPlaylists({ commit }, playlists: SimplifiedPlaylist[]) {
            commit(MutationNames.SET_PLAYLISTS, playlists);
        },
        updatePlaylists({ commit }, playlists: SimplifiedPlaylist[]) {
            commit(MutationNames.UPDATE_PLAYLISTS, playlists);
        },
    },
    plugins: [
        createPersistedState({
            storage: sessionStorage,
        }),
    ],
});

export default store;
