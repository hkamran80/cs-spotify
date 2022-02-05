<script setup lang="ts">
import { onBeforeMount } from "vue";
import { useStore } from "../store";
import PlaylistCard from "../components/PlaylistCard.vue";
import { checkTokenExpired, getNewTokens } from "../spotify/getNewTokens";

import { SpotifyWebApi } from "spotify-web-api-ts";
import { useRouter } from "vue-router";

const store = useStore();
const router = useRouter();

const spotify = new SpotifyWebApi({
    accessToken: store.state.accessToken as string,
});

onBeforeMount(async () => {
    try {
        if (checkTokenExpired(store)) {
            const newToken = await getNewTokens(store);
            if (newToken) {
                spotify.setAccessToken(newToken);
            }
        }

        let playlistsResponse = await spotify.playlists.getMyPlaylists({
            limit: 50,
        });

        //  playlistsResponse.items;
        store.dispatch("setPlaylists", playlistsResponse.items);

        while (playlistsResponse.next) {
            const { searchParams } = new URL(playlistsResponse.next);
            playlistsResponse = await spotify.playlists.getMyPlaylists({
                limit: Number(searchParams.get("limit")),
                offset: Number(searchParams.get("offset")),
            });

            store.dispatch("updatePlaylists", playlistsResponse.items);
        }
    } catch (error) {
        const newToken = await getNewTokens(store);
        if (newToken) {
            spotify.setAccessToken(newToken);
            router.push({
                name: "Playlists",
                query: {
                    refresh: new Date().getTime(),
                },
            });
        }

        console.error(error);
    }
});
</script>

<template>
    <h1 class="text-4xl text-black dark:text-white">Playlists</h1>
    <h2 class="text-2xl text-gray-800 dark:text-gray-200 mt-3">
        Click a playlist below to edit
    </h2>

    <div
        class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
        v-if="store.state.playlists"
    >
        <playlist-card
            v-for="playlist in store.state.playlists"
            :key="playlist.id"
            :playlist-id="playlist.id"
            :name="playlist.name"
            :href="playlist.external_urls.spotify"
            :description="playlist.description"
        />
    </div>
    <div
        class="mt-8 w-full items-center flex py-2 font-semibold leading-6 text-2xl shadow rounded-lg text-black dark:text-white transition ease-in-out duration-150 cursor-wait"
        v-else
    >
        <div class="flex-1"></div>
        <div class="inline-flex">
            <svg
                class="animate-spin mr-3 h-6 w-6 text-black dark:text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                ></circle>
                <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
            </svg>

            Loading playlists...
        </div>
        <div class="flex-1"></div>
    </div>
</template>
