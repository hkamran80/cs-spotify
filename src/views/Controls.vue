<script setup lang="ts">
import { SpotifyWebApi } from "spotify-web-api-ts";
import type { Device } from "../types/SpotifyObjects";
import feather from "feather-icons";

import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { checkTokenExpired, getNewTokens } from "../spotify/getNewTokens";
import { useStore } from "../store";

import {
    Popover,
    PopoverButton,
    PopoverPanel,
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle,
} from "@headlessui/vue";

const router = useRouter();
const store = useStore();

const spotify = new SpotifyWebApi({
    accessToken: store.state.accessToken as string,
});

// TODO: Switch to full async (`onBeforeMount`)

if (checkTokenExpired(store)) {
    getNewTokens(store).then((newToken) => {
        if (newToken) {
            spotify.setAccessToken(newToken);
            router.push({ name: "Controls" });
        }
    });
}

const currentlyPlaying = ref();
const trackSaved = ref<boolean>(false);
const duration = ref<string>();
const devices = ref<Device[]>([]);

const deviceSelectorModal = ref<boolean>(false);

const convertMsToMinSec = (ms: number) => {
    let ms_date = new Date(ms);
    return `${ms_date.getMinutes()}:${padNumber(ms_date.getSeconds())}`;
};

const padNumber = (number: number | string): string =>
    Number(number < 10)
        ? "0" + Number(number).toString()
        : Number(number).toString();

const setVolume = (percent: number) => {
    spotify.player.setVolume(percent).catch(console.error);
};

const getDevices = async () => {
    devices.value = await spotify.player.getMyDevices();
    if (typeof devices.value === "object") {
        // @ts-ignore
        devices.value = devices.value.devices;
    }
};
const transferPlayback = async (active: boolean, deviceId: string | null) => {
    if (!active && deviceId !== null) {
        await spotify.player.transferPlayback(deviceId);
        await getDevices();
    }
};

const getPlayback = () =>
    spotify.player
        .getPlaybackInfo()
        .then((json) => (currentlyPlaying.value = json))
        .then(
            () =>
                currentlyPlaying.value.item &&
                (duration.value = convertMsToMinSec(
                    currentlyPlaying.value.item.duration_ms
                ))
        )
        .then(
            () =>
                currentlyPlaying.value.item &&
                spotify.library
                    .isTrackSaved(currentlyPlaying.value.item.id)
                    .then((result) => (trackSaved.value = result))
                    .catch((error) => {
                        getNewTokens(store).then((newToken) => {
                            if (newToken) {
                                spotify.setAccessToken(newToken);
                                router.push({
                                    name: "Controls",
                                });
                            }
                        });

                        console.error(error);
                        router.push({ name: "Controls" });
                    })
        )
        .catch((error) => {
            getNewTokens(store).then((newToken) => {
                if (newToken) {
                    spotify.setAccessToken(newToken);
                    router.push({
                        name: "Controls",
                    });
                }
            });

            console.error(error);
            router.push({ name: "Controls" });
        });

getPlayback();

const playbackInterval = ref<number>();

onMounted(() => (playbackInterval.value = setInterval(getPlayback, 3500)));
onBeforeUnmount(() => clearInterval(playbackInterval.value));
</script>

<template>
    <h1 class="text-4xl text-black dark:text-white mb-8">Controls</h1>

    <div v-if="currentlyPlaying && currentlyPlaying.item">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
            <img :src="currentlyPlaying.item.album.images[0].url" />

            <div class="col-span-3 flex flex-col space-y-1">
                <a
                    :href="currentlyPlaying.item.external_urls.spotify"
                    rel="noopener noreferrer"
                    class="text-black dark:text-white font-bold text-3xl hover:underline"
                    target="_blank"
                    v-text="currentlyPlaying.item.name"
                />

                <div class="text-black dark:text-white font-medium text-2xl">
                    <span v-for="artist in currentlyPlaying.item.artists">
                        <a
                            :href="artist.external_urls.spotify"
                            rel="noopener noreferrer"
                            class="hover:underline"
                            target="_blank"
                            v-text="
                                `${artist.name}${
                                    currentlyPlaying.item.artists.indexOf(
                                        artist
                                    ) !==
                                    currentlyPlaying.item.artists.length - 1
                                        ? ', '
                                        : ''
                                }`
                            "
                        />
                    </span>
                </div>

                <a
                    :href="currentlyPlaying.item.album.external_urls.spotify"
                    rel="noopener noreferrer"
                    class="text-black dark:text-white font-medium text-xl hover:underline"
                    target="_blank"
                    v-text="currentlyPlaying.item.album.name"
                />

                <div class="pt-8 flex flex-row space-x-10 md:space-x-12">
                    <span
                        class="text-black dark:text-white"
                        v-html="feather.icons['skip-back'].toSvg()"
                        @click="spotify.player.skipToPrevious()"
                    />

                    <span
                        class="text-black dark:text-white"
                        v-html="feather.icons.pause.toSvg()"
                        v-if="currentlyPlaying.is_playing"
                        @click="spotify.player.pause()"
                    />
                    <span
                        class="text-black dark:text-white"
                        v-html="feather.icons.play.toSvg()"
                        v-else
                        @click="spotify.player.play()"
                    />

                    <span
                        class="text-black dark:text-white"
                        v-html="feather.icons['skip-forward'].toSvg()"
                        @click="spotify.player.skipToNext()"
                    />
                </div>
                <div class="pt-4 flex flex-row space-x-10 md:space-x-12">
                    <span
                        :class="[
                            !trackSaved
                                ? 'text-gray-400 dark:text-gray-600'
                                : 'text-black dark:text-white',
                        ]"
                        v-html="feather.icons.heart.toSvg()"
                        @click="
                            trackSaved
                                ? spotify.library.removeSavedTrack(
                                      currentlyPlaying.item.id
                                  )
                                : spotify.library.saveTrack(
                                      currentlyPlaying.item.id
                                  )
                        "
                    />

                    <span
                        :class="[
                            !currentlyPlaying.shuffle_state
                                ? 'text-gray-400 dark:text-gray-600'
                                : 'text-black dark:text-white',
                        ]"
                        v-html="feather.icons.shuffle.toSvg()"
                        @click="
                            spotify.player.setShuffle(
                                !currentlyPlaying.shuffle_state
                            )
                        "
                    />

                    <span
                        :class="[
                            currentlyPlaying.repeat_state === 'off'
                                ? 'text-gray-400 dark:text-gray-600'
                                : 'text-black dark:text-white',
                        ]"
                        v-html="feather.icons.repeat.toSvg()"
                    />

                    <Popover v-slot="{ open }" class="relative">
                        <PopoverButton :class="open ? '' : 'text-opacity-90'">
                            <span
                                class="text-black dark:text-white"
                                v-html="feather.icons['volume-2'].toSvg()"
                            />
                        </PopoverButton>

                        <transition
                            enter-active-class="transition duration-200 ease-out"
                            enter-from-class="-translate-y-5 scale-0 opacity-0"
                            enter-to-class="translate-y-0 scale-100 opacity-100"
                            leave-active-class="transition duration-150 ease-in"
                            leave-from-class="translate-y-0 scale-100 opacity-100"
                            leave-to-class="-translate-y-5 scale-0 opacity-0"
                        >
                            <PopoverPanel
                                class="absolute z-10 w-xl px-6 mt-1 transform -translate-x-1/2 left-1/2"
                            >
                                <div
                                    class="overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-4 bg-gray-50 dark:bg-gray-900"
                                >
                                    <span
                                        class="text-gray-900 dark:text-gray-100"
                                        v-text="currentlyPlaying.device.name"
                                    />
                                    <input
                                        type="range"
                                        class="mt-1"
                                        :value="
                                            currentlyPlaying.device
                                                .volume_percent
                                        "
                                        @input="setVolume(Number(($event.target as HTMLInputElement)?.value))"
                                    />
                                </div>
                            </PopoverPanel>
                        </transition>
                    </Popover>

                    <span
                        class="text-black dark:text-white"
                        v-html="feather.icons.cast.toSvg()"
                        @click="
                            async () => {
                                await getDevices();
                                deviceSelectorModal = true;
                            }
                        "
                    />
                </div>
            </div>
        </div>

        <div class="mt-8 w-full bg-gray-200 dark:bg-gray-800 h-1">
            <div
                class="bg-pink-700 dark:bg-pink-400 h-1 rounded-full [transition-width] duration-150 ease-in"
                :class="[
                    `w-[${Math.round(
                        (currentlyPlaying.progress_ms /
                            currentlyPlaying.item.duration_ms) *
                            100
                    )}%]`,
                ]"
            />
        </div>

        <div class="mt-2 text-xs flex">
            <div class="flex-1"></div>
            <span
                class="text-gray-400"
                v-text="
                    `${convertMsToMinSec(
                        currentlyPlaying.progress_ms
                    )} / ${duration}`
                "
            />
        </div>

        <TransitionRoot appear :show="deviceSelectorModal" as="template">
            <Dialog as="div" @close="deviceSelectorModal = false">
                <div
                    class="fixed inset-0 z-10 overflow-y-auto bg-black bg-opacity-60"
                >
                    <div class="min-h-screen px-4 text-center">
                        <TransitionChild
                            as="template"
                            enter="duration-300 ease-out"
                            enter-from="opacity-0"
                            enter-to="opacity-100"
                            leave="duration-200 ease-in"
                            leave-from="opacity-100"
                            leave-to="opacity-0"
                        >
                            <DialogOverlay class="fixed inset-0" />
                        </TransitionChild>

                        <span
                            class="inline-block h-screen align-middle"
                            aria-hidden="true"
                        >
                            &#8203;
                        </span>

                        <TransitionChild
                            as="template"
                            enter="duration-300 ease-out"
                            enter-from="opacity-0 scale-95"
                            enter-to="opacity-100 scale-100"
                            leave="duration-200 ease-in"
                            leave-from="opacity-100 scale-100"
                            leave-to="opacity-0 scale-95"
                        >
                            <div
                                class="inline-block w-full max-w-xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-900 shadow-xl rounded-2xl"
                            >
                                <DialogTitle
                                    as="h3"
                                    class="text-xl font-medium leading-6 text-black dark:text-white flex"
                                >
                                    <span class="flex-1">
                                        Device Selector
                                    </span>
                                    <span
                                        class="hover:cursor-pointer"
                                        v-html="feather.icons.x.toSvg()"
                                        @click="deviceSelectorModal = false"
                                    />
                                </DialogTitle>
                                <div class="mt-2">
                                    <div
                                        class="mt-6 space-y-3"
                                        v-if="devices.length > 0"
                                    >
                                        <fieldset>
                                            <legend
                                                id="device-selector-label"
                                                class="sr-only"
                                            >
                                                Device selector
                                            </legend>
                                            <ul
                                                class="space-y-4"
                                                role="radiogroup"
                                                aria-labelledby="device-selector-label"
                                            >
                                                <li
                                                    v-for="device in devices"
                                                    :key="device.id?.toString()"
                                                    :aria-checked="
                                                        device.is_active
                                                    "
                                                    role="radio"
                                                    class="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-offset-2 focus:ring-pink-700 dark:focus:ring-pink-400"
                                                    @click="
                                                        transferPlayback(
                                                            device.is_active,
                                                            device.id
                                                        )
                                                    "
                                                >
                                                    <div
                                                        class="rounded-lg border border-gray-300 bg-white dark:bg-gray-800 px-6 py-4 hover:border-gray-400 sm:flex sm:justify-between"
                                                    >
                                                        <p
                                                            class="font-medium text-black dark:text-white"
                                                            v-text="device.name"
                                                        />
                                                        <div
                                                            class="text-gray-500 dark:text-gray-400"
                                                        >
                                                            <p
                                                                class="text-sm sm:inline"
                                                                v-text="
                                                                    device.type
                                                                "
                                                            />
                                                        </div>
                                                    </div>
                                                    <div
                                                        :class="[
                                                            device.is_active
                                                                ? 'border-pink-700 dark:border-pink-400'
                                                                : 'border-transparent',
                                                        ]"
                                                        class="absolute inset-0 rounded-lg border-2 pointer-events-none"
                                                        aria-hidden="true"
                                                    ></div>
                                                </li>
                                            </ul>
                                        </fieldset>
                                    </div>

                                    <div
                                        class="w-full items-center flex py-2 mt-4 font-semibold leading-6 text-sm shadow rounded-lg bg-gray-800 text-white transition ease-in-out duration-150 cursor-wait"
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

                                            Loading devices...
                                        </div>
                                        <div class="flex-1"></div>
                                    </div>
                                </div>
                            </div>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>

    <div class="bg-white dark:bg-gray-900 px-6 py-4 rounded-lg" v-else>
        <p class="text-black dark:text-white">
            Nothing's playing right now. Start playing something via a Spotify
            client, then check back here.
        </p>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
            Starting playback through Control Surface is coming soon.
        </p>
    </div>
</template>
