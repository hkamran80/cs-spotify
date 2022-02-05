<script setup lang="ts">
import feather from "feather-icons";

const features = {
    "Playback Controls": feather.icons.play,
    "Playlist Editing": feather.icons.list,
    "Playlist Analysis": feather.icons["pie-chart"],
};
</script>

<template>
    <main class="mx-auto px-4">
        <div class="text-center">
            <h1
                class="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl"
            >
                <span class="block xl:inline">
                    A better way to use your Spotify account
                </span>
            </h1>
            <p
                class="mt-3 max-w-md mx-auto text-base text-gray-600 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl"
            >
                Use the power of the Control Surface for Spotify to organize
                your playlists and to control your playback from the web
            </p>
            <div
                class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8"
            >
                <div class="rounded-md shadow">
                    <router-link
                        to="/authorize"
                        class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-pink-700 dark:bg-pink-500 hover:bg-pink-600 md:py-4 md:text-lg md:px-10"
                    >
                        Get started
                    </router-link>
                </div>
            </div>
        </div>

        <div class="mt-24">
            <h2 class="text-3xl font-extrabold text-black dark:text-white mb-6">
                Features
            </h2>
            <dl class="space-y-10 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
                <div v-for="(icon, name) in features">
                    <div
                        class="flex items-center justify-center h-12 w-12 rounded-md bg-pink-700 bg:text-pink-400 text-white"
                        v-html="icon.toSvg()"
                    />

                    <div class="mt-5">
                        <dt
                            class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                            v-text="name"
                        />
                    </div>
                </div>
            </dl>
        </div>

        <div class="mt-24 lg:grid lg:grid-cols-3 lg:gap-8">
            <div>
                <h2 class="text-3xl font-extrabold text-black dark:text-white">
                    Frequently asked questions
                </h2>
            </div>
            <div class="mt-12 lg:mt-0 lg:col-span-2">
                <dl class="space-y-12">
                    <div>
                        <dt
                            class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                        >
                            Does Control Surface for Spotify share or sell any
                            of my data?
                        </dt>
                        <dd class="mt-2 text-base text-gray-500">
                            Absolutely not. All your data is kept on your
                            device. None of it ever touches our servers.
                        </dd>
                    </div>

                    <div>
                        <dt
                            class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                        >
                            How does it worK?
                        </dt>
                        <dd class="mt-2 text-base text-gray-500">
                            Control Surface for Spotify works by communicating
                            with Spotify via their API.
                        </dd>
                    </div>

                    <div>
                        <dt
                            class="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100"
                        >
                            What's the price?
                        </dt>
                        <dd class="mt-2 text-base text-gray-500">100% free.</dd>
                    </div>
                </dl>
            </div>
        </div>
    </main>
</template>
