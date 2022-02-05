<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "../store";

const store = useStore();
const router = useRouter();

const retrievingTokens = ref<boolean>(false);

const tokens = ref<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
}>();
const startFlow = () => {
    if (tokens.value) {
        window.open(
            `https://accounts.spotify.com/authorize?client_id=${
                tokens.value.clientId
            }&response_type=code&redirect_uri=${encodeURIComponent(
                tokens.value.redirectUri
            )}&scope=${encodeURIComponent(tokens.value.scopes.join(" "))}`,
            "_self"
        );
    }
};
const getTokens = (queryParameters: URLSearchParams) => {
    if (tokens.value) {
        let tokenParameters = new URLSearchParams({
            grant_type: "authorization_code",
            code: queryParameters.get("code") as string,
            redirect_uri: tokens.value.redirectUri,
        });

        fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(
                    `${tokens.value.clientId}:${tokens.value.clientSecret}`
                )}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: tokenParameters,
        })
            .then((response) => response.json())
            .then((json) => {
                store.dispatch("setSpotifyCredentials", {
                    accessToken: json.access_token,
                    refreshToken: json.refresh_token,
                    expiresIn: json.expires_in,
                });

                router.push({ name: "Controls" });
            })
            .catch((error) => {
                if (error.response) {
                    if (
                        error.response.data.error_description.indexOf(
                            "Invalid authorization code"
                        ) != -1
                    ) {
                        startFlow();
                    } else {
                        console.error(error);
                    }
                } else {
                    console.error(error);
                }
            });
    }
};

onMounted(() => {
    let queryParameters = new URLSearchParams(window.location.search);
    tokens.value = {
        clientId: import.meta.env.VITE_APP_SPOTIFY_CLIENT_ID as string,
        clientSecret: import.meta.env.VITE_APP_SPOTIFY_CLIENT_SECRET as string,
        redirectUri: import.meta.env.VITE_APP_REDIRECT_URI as string,
        scopes: (import.meta.env.VITE_APP_SCOPES as string).split(" "),
    };
    if (queryParameters.get("code")) {
        retrievingTokens.value = true;
        getTokens(queryParameters);
    }
});
</script>

<template>
    <h1 class="text-4xl text-black dark:text-white">Welcome</h1>
    <h2 class="text-2xl text-gray-800 dark:text-gray-200 mt-3">
        Before you get started, please sign in to your Spotify account.
    </h2>

    <p class="mt-4 text-gray-800 dark:text-gray-400">
        Control Surface for Spotify will only get access to certain things in
        your Spotify account, specifically your basic account information, the
        ability to read and modify your public, private, and collobrative
        playlists, the ability to read and modify the playback state (playback
        controls and current playback information), and the ability to read and
        modify your library (saved tracks/albums/artists). We
        <strong class="underline">will never</strong> store your data or
        credentials without your explicit consent.
    </p>

    <p class="mt-4 text-gray-800 dark:text-gray-400">
        Control Surface for Spotify does not store any of your data on any
        server. Your Spotify credentials are only stored on your device. An
        authorization framework called OAuth2 is used. Read more about OAuth2 on
        <a
            href="https://www.digitalocean.com/community/tutorials/an-introduction-to-oauth-2"
            rel="noopener noreferrer"
            class="underline"
            target="_blank"
        >
            DigitalOcean</a
        >
        or on
        <a
            href="https://www.reddit.com/r/explainlikeimfive/comments/2ba1aw/eli5_what_is_oauth/"
            rel="noopener noreferrer"
            class="underline"
            target="_blank"
        >
            Reddit</a
        >.
    </p>

    <button
        class="w-full bg-[#1db954] py-2 mt-8 rounded-lg text-white"
        v-if="!retrievingTokens"
        @click="startFlow"
    >
        Sign in with Spotify
    </button>
    <div
        class="w-full items-center flex py-2 mt-8 font-semibold leading-6 text-sm shadow rounded-lg bg-[#1db954] text-white transition ease-in-out duration-150 cursor-wait"
        v-else
    >
        <div class="flex-1"></div>
        <div class="inline-flex">
            <svg
                class="animate-spin mr-3 h-5 w-5 text-white"
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

            Retrieving tokens...
        </div>
        <div class="flex-1"></div>
    </div>
</template>
