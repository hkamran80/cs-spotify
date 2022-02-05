<script async setup lang="ts">
import { SpotifyWebApi } from "spotify-web-api-ts";
import type {
    PlaylistItem,
    SimplifiedArtist,
    SimplifiedAlbum,
    Track,
    Playlist,
    Device,
} from "../types/SpotifyObjects";
import feather from "feather-icons";
import { arrayMoveMutable } from "array-move";

import { computed, onBeforeMount, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { checkTokenExpired, getNewTokens } from "../spotify/getNewTokens";
import { useStore } from "../store";

import VLazyImage from "v-lazy-image";
import BottomBanner from "../components/BottomBanner.vue";
import {
    TransitionRoot,
    TransitionChild,
    Dialog,
    DialogOverlay,
    DialogTitle,
} from "@headlessui/vue";

const route = useRoute();
const router = useRouter();
const store = useStore();

type UniquePlaylistItem = PlaylistItem & { uniqueId: string };

const spotify = new SpotifyWebApi({
    accessToken: store.state.accessToken as string,
});

const playlist = ref<Playlist>();
const originalTracks = ref();
const tracks = ref();
const devices = ref<Device[]>([]);

const editable = ref<boolean>(false);
const editMode = ref<boolean>(false);
const selectedTracks = ref<string[]>([]);

const toggleEditMode = () => (editMode.value = !editMode.value);
const toggleTrackSelection = (trackId: string): void => {
    const included = selectedTracks.value.includes(trackId);
    if (included) {
        selectedTracks.value = selectedTracks.value.filter(
            (selectedTrackId) => selectedTrackId !== trackId
        );
    } else {
        selectedTracks.value.push(trackId);
    }
};

const generateTrackId = (trackId: string): string =>
    trackId +
    originalTracks.value.findIndex(
        (originalTrack: UniquePlaylistItem) =>
            originalTrack.track.id === trackId
    );

const trackIds = ref<string[]>([]);
const generateTrackIdList = (): void =>
    (trackIds.value = tracks.value.map(
        (track: UniquePlaylistItem) => track.uniqueId
    ));

const moveTrack = (trackId: string, direction: "up" | "down"): void => {
    generateTrackIdList();

    let index = trackIds.value.indexOf(trackId);
    if (direction === "up" && index > 0) {
        arrayMoveMutable(tracks.value, index, index - 1);
    } else if (direction === "down" && index < trackIds.value.length) {
        arrayMoveMutable(tracks.value, index, index + 1);
    }
};
const bulkMoveTracks = (direction: "up" | "down"): void => {
    generateTrackIdList();

    let indexes = selectedTracks.value
        .map((trackId) => trackIds.value.indexOf(trackId))
        .sort((a, b) => a - b);

    let highestIndex: number =
        direction.toString() === "up" ? indexes[0] - 1 : indexes[0] + 1;
    if (highestIndex < 0) {
        highestIndex = 0;
    }

    let newIndexes: number[][] = indexes.map((index: number) => {
        return [index, highestIndex + indexes.indexOf(index)];
    });

    if (direction === "down") {
        newIndexes = newIndexes.reverse();
    }

    newIndexes.forEach(([oldIndex, newIndex]) =>
        arrayMoveMutable(tracks.value, oldIndex, newIndex)
    );

    generateTrackIdList();
};
const trackDifferences = computed(() =>
    (tracks.value as UniquePlaylistItem[])
        .map(({ uniqueId }, index) => [
            (originalTracks.value as UniquePlaylistItem[])[index].uniqueId ===
                uniqueId,
            index,
        ])
        .filter(([sameIds]) => !sameIds)
);
const generateChanges = () => {
    console.debug(trackDifferences.value);
    console.debug(
        (trackDifferences.value as [boolean, number][]).map(
            ([, newIndex]) => {}
        )
    );
    console.debug(
        (trackDifferences.value as [boolean, number][]).map(([, index]) => [
            tracks.value[index],
            originalTracks.value[index],
        ])
    );

    // TODO: Add change algorithm
};

const firstTrack = computed(
    () => (tracks.value[0] as UniquePlaylistItem).uniqueId
);
const lastTrack = computed(
    () => (tracks.value[tracks.value.length - 1] as UniquePlaylistItem).uniqueId
);

const playPlaylist = async () => {
    await getDevices();

    if (devices.value.length > 0) {
        const activeDevices = devices.value.filter(
            (device) => device.is_active
        );

        if (activeDevices.length > 0) {
            spotify.player.play({
                context_uri: "spotify:playlist:" + playlist.value?.id,
            });
        } else {
            deviceSelectorModal.value = true;
        }
    } else {
        noActiveDevicesNotification.value = true;
    }
};

const noActiveDevicesNotification = ref<boolean>(false);
const deviceSelectorModal = ref<boolean>(false);

const analysisModal = ref<boolean>(false);
const playlistAnalysis = ref();
const analyzePlaylist = () => {
    let artistCounts = {} as { [artistId: string]: number };
    let albumCounts = {} as { [albumId: string]: number };

    let artists = tracks.value
        .filter((track: UniquePlaylistItem) => track.track.type === "track")
        .flatMap((track: UniquePlaylistItem) => (track.track as Track).artists);
    let albums = tracks.value
        .filter((track: UniquePlaylistItem) => track.track.type === "track")
        .flatMap((track: UniquePlaylistItem) => (track.track as Track).album);

    artists.forEach(
        (artist: SimplifiedArtist) =>
            (artistCounts[artist.id] = artistCounts[artist.id]
                ? artistCounts[artist.id] + 1
                : 1)
    );
    albums.forEach(
        (album: SimplifiedAlbum) =>
            (albumCounts[album.id] = albumCounts[album.id]
                ? albumCounts[album.id] + 1
                : 1)
    );

    artistCounts = Object.fromEntries(
        Object.entries(artistCounts).sort((a, b) => b[1] - a[1])
    );
    albumCounts = Object.fromEntries(
        Object.entries(albumCounts).sort((a, b) => b[1] - a[1])
    );

    let topArtistTrackCount = Object.entries(artistCounts)[0][1];
    let topAlbumTrackCount = Object.entries(albumCounts)[0][1];

    let topArtists = Object.fromEntries(
        Object.entries(artistCounts).filter(
            ([_, count]) => count === topArtistTrackCount
        )
    );
    let topAlbums = Object.fromEntries(
        Object.entries(albumCounts).filter(
            ([_, count]) => count === topAlbumTrackCount
        )
    );

    playlistAnalysis.value = {
        tracks: [
            ...new Set(
                tracks.value
                    .filter(
                        (track: UniquePlaylistItem) =>
                            track.track.type === "track"
                    )
                    .map(
                        (track: UniquePlaylistItem) => (track.track as Track).id
                    )
            ),
        ].length,
        artists: [
            ...new Set(
                (artists as SimplifiedArtist[]).map((artist) => artist.id)
            ),
        ].map(
            (artistId) =>
                artists.find(
                    (artist: SimplifiedArtist) => artist.id === artistId
                ).name
        ),
        artistCounts,
        topArtists,
        topArtistsPretty: Object.keys(topArtists)
            .map(
                (artistId) =>
                    artists.find(
                        (artist: SimplifiedArtist) =>
                            artist.id === artistId.toString()
                    ).name
            )
            .map((artistName, index) => {
                let length = Object.keys(topArtists).length;
                if (length > 1) {
                    return index === length - 1
                        ? `and ${artistName}`
                        : artistName;
                } else {
                    return artistName;
                }
            })
            .join(Object.keys(topArtists).length <= 2 ? " " : ", "),
        albums: [
            ...new Set((albums as SimplifiedAlbum[]).map((album) => album.id)),
        ].map(
            (albumId) =>
                albums.find((album: SimplifiedAlbum) => album.id === albumId)
                    .name
        ),
        topAlbums,
        topAlbumsPretty: Object.keys(topAlbums)
            .map((albumId) => {
                let album: SimplifiedAlbum = albums.find(
                    (album: SimplifiedAlbum) => album.id === albumId.toString()
                );

                return `${album.name} (${album.artists
                    .map((artist) => artist.name)
                    .map((artistName, index) => {
                        let length = Object.keys(album.artists).length;
                        if (length > 1) {
                            return index === length - 1
                                ? `and ${artistName}`
                                : artistName;
                        } else {
                            return artistName;
                        }
                    })
                    .join(
                        Object.keys(album.artists).length <= 2 ? " " : ", "
                    )})`;
            })
            .map((albumName, index) => {
                let length = Object.keys(topAlbums).length;
                if (length > 1) {
                    return index === length - 1
                        ? `and ${albumName}`
                        : albumName;
                } else {
                    return albumName;
                }
            })
            .join(Object.keys(topAlbums).length <= 2 ? " " : ", "),
    };
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

onBeforeMount(async () => {
    try {
        if (checkTokenExpired(store)) {
            const newToken = await getNewTokens(store);
            if (newToken) {
                spotify.setAccessToken(newToken);
            }
        }

        const { id: userId } = await spotify.users.getMe();
        const playlistResponse = await spotify.playlists.getPlaylist(
            route.params.id as string
        );

        playlist.value = playlistResponse;
        editable.value =
            playlistResponse.owner.id === userId ||
            playlistResponse.collaborative;

        let items = playlistResponse.tracks.items;
        originalTracks.value = items.map(
            (track): UniquePlaylistItem =>
                Object.assign(
                    {
                        uniqueId:
                            track.track.id +
                            items.findIndex(
                                (item) => item.track.id === track.track.id
                            ),
                    },
                    track
                )
        );
        tracks.value = items.map(
            (track): UniquePlaylistItem =>
                Object.assign(
                    {
                        uniqueId: generateTrackId(track.track.id),
                    },
                    track
                )
        );

        let tracksResponse = playlistResponse.tracks;
        while (tracksResponse.next) {
            const { searchParams } = new URL(tracksResponse.next);
            tracksResponse = await spotify.playlists.getPlaylistItems(
                route.params.id as string,
                {
                    limit: Number(searchParams.get("limit")),
                    offset: Number(searchParams.get("offset")),
                }
            );

            items = tracksResponse.items;

            originalTracks.value = (
                originalTracks.value as UniquePlaylistItem[]
            ).concat(
                tracksResponse.items.map(
                    (track): UniquePlaylistItem =>
                        Object.assign(
                            {
                                uniqueId:
                                    track.track.id +
                                    (items.findIndex(
                                        (item) =>
                                            item.track.id === track.track.id
                                    ) +
                                        originalTracks.value.length),
                            },
                            track
                        )
                )
            );

            tracks.value = (tracks.value as UniquePlaylistItem[]).concat(
                tracksResponse.items.map(
                    (track): UniquePlaylistItem =>
                        Object.assign(
                            {
                                uniqueId: generateTrackId(track.track.id),
                            },
                            track
                        )
                )
            );

            generateTrackIdList();
            await getDevices();
        }
    } catch (error) {
        const newToken = await getNewTokens(store);
        if (newToken) {
            spotify.setAccessToken(newToken);
            router.push({
                name: "Editor",
                params: {
                    id: route.params.id,
                },
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
    <div class="flex align-middle" v-if="playlist">
        <div class="flex-1 md:flex md:space-x-6">
            <v-lazy-image
                :src="playlist.images[0].url"
                class="h-20 w-20 mb-4 md:mb-0"
            />

            <div class="flex flex-col align-middle" v-if="playlist.description">
                <a
                    :href="playlist ? playlist.external_urls.spotify : ''"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <h1
                        class="text-4xl text-pink-800 dark:text-pink-400 hover:underline"
                        v-text="playlist ? playlist.name : 'Loading...'"
                    />
                </a>
                <h2
                    class="text-2xl text-gray-800 dark:text-gray-200 mt-3"
                    v-text="
                        playlist
                            ? playlist.description.replace(/&amp;#x27;/g, '\'')
                            : 'Loading...'
                    "
                    v-if="playlist.description"
                />
            </div>
            <a
                :href="playlist ? playlist.external_urls.spotify : ''"
                target="_blank"
                rel="noopener noreferrer"
                v-else
            >
                <h1
                    class="text-4xl text-pink-800 dark:text-pink-400"
                    v-text="playlist ? playlist.name : 'Loading...'"
                />
            </a>
        </div>

        <div class="md:pl-2 flex space-x-6">
            <transition
                enter-active-class="transition-opacity duration-150 ease-in"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <span
                    class="text-black dark:text-white hover:cursor-pointer"
                    v-html="feather.icons.save.toSvg()"
                    @click="generateChanges"
                    v-if="editable && editMode && trackDifferences.length > 0"
                />
            </transition>

            <span
                class="transition-colors duration-150 ease-in"
                :class="[
                    !editMode
                        ? 'text-gray-400 dark:text-gray-600 hover:cursor-pointer'
                        : 'text-black dark:text-white hover:cursor-pointer',
                ]"
                v-html="feather.icons['edit-2'].toSvg()"
                @click="toggleEditMode"
                v-if="editable"
            />

            <span
                class="text-black dark:text-white hover:cursor-pointer"
                v-html="feather.icons['pie-chart'].toSvg()"
                @click="
                    analysisModal = true;
                    analyzePlaylist();
                "
            />

            <span
                class="text-black dark:text-white hover:cursor-pointer"
                v-html="feather.icons.play.toSvg()"
                @click="playPlaylist"
            />
        </div>
    </div>

    <div
        class="mt-8 space-y-4"
        :class="{ 'pb-6': selectedTracks.length > 0 }"
        v-if="playlist && tracks && originalTracks"
    >
        <div
            v-for="track in tracks"
            :key="track.track.id"
            class="text-black dark:text-white flex flex-row space-x-6"
        >
            <a
                :href="track.track.album.external_urls.spotify"
                target="_blank"
                rel="noopener noreferrer"
                class="font-semibold"
            >
                <v-lazy-image
                    :src="track.track.album.images[0].url"
                    class="h-14 w-14"
                />
            </a>

            <div class="flex-1 flex flex-col">
                <a
                    :href="track.track.external_urls.spotify"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="font-semibold hover:underline"
                    v-text="track.track.name"
                />

                <span
                    class="text-gray-700 dark:text-gray-300"
                    v-text="
                        track.track.artists
                            .map((artist: any) => artist.name)
                            .join(', ')
                    "
                />
            </div>

            <transition
                enter-active-class="transition-opacity duration-150 ease-in"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition-opacity duration-150 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div class="sm:mt-3 space-x-3" v-if="editMode">
                    <button
                        type="button"
                        class="hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full md:p-1"
                        :class="{
                            hidden: track.uniqueId === lastTrack,
                        }"
                        v-html="feather.icons['arrow-down'].toSvg()"
                        @click="() => moveTrack(track.uniqueId, 'down')"
                    />
                    <button
                        type="button"
                        class="hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full md:p-1"
                        :class="{
                            hidden: track.uniqueId === firstTrack,
                        }"
                        v-html="feather.icons['arrow-up'].toSvg()"
                        @click="() => moveTrack(track.uniqueId, 'up')"
                    />
                    <button
                        type="button"
                        class="hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full md:p-1"
                        v-html="
                            feather.icons[
                                selectedTracks.includes(track.uniqueId)
                                    ? 'check-circle'
                                    : 'circle'
                            ].toSvg()
                        "
                        @click="() => toggleTrackSelection(track.uniqueId)"
                    />
                </div>
            </transition>

            <button
                type="button"
                class="hover:bg-gray-400 dark:hover:bg-gray-600 rounded-full"
                v-html="feather.icons.play.toSvg()"
                @click="
                    spotify.player.play({
                        context_uri: 'spotify:playlist:' + playlist?.id,
                        offset: {
                            position: trackIds.indexOf(track.uniqueId),
                        },
                    })
                "
                v-if="devices.length > 0"
            />
        </div>
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

            Loading playlist...
        </div>
        <div class="flex-1"></div>
    </div>

    <div
        class="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end"
    >
        <transition
            enter-active-class="transition ease-in duration-100"
            enter-from-class="translate-x-10 opacity-0"
            enter-to-class="opacity-100 translate-x-0"
            leave-active-class="transition ease-in duration-100"
            leave-from-class="translate-x-0 opacity-100"
            leave-to-class="translate-x-10 opacity-0"
        >
            <div
                v-if="noActiveDevicesNotification"
                x-description="Notification panel, show/hide based on alert state."
                class="max-w-sm w-full bg-white dark:bg-gray-900 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
            >
                <div class="p-4">
                    <div class="flex items-start">
                        <div class="flex-shrink-0">
                            <span
                                class="h-6 w-6 text-red-600"
                                v-html="feather.icons['alert-triangle'].toSvg()"
                            />
                        </div>
                        <div class="ml-3 w-0 flex-1 pt-0.5">
                            <p
                                class="text-sm font-medium text-black dark:text-white"
                            >
                                No active devices
                            </p>
                        </div>
                        <div class="ml-4 flex-shrink-0 flex">
                            <button
                                @click="noActiveDevicesNotification = false"
                                class="bg-white dark:bg-gray-900 rounded-md inline-flex text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                <span class="sr-only">Close</span>
                                <span v-html="feather.icons.x.toSvg()" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>

    <transition
        enter-active-class="transition duration-150 ease-in"
        enter-from-class="translate-y-36"
        enter-to-class="translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0"
        leave-to-class="translate-y-36"
    >
        <bottom-banner
            :selectedTrackLength="selectedTracks.length"
            @move="bulkMoveTracks"
            @clear="selectedTracks = []"
            v-if="editMode && selectedTracks.length > 1"
        />
    </transition>

    <TransitionRoot appear :show="analysisModal" as="template">
        <Dialog as="div" @close="analysisModal = false">
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
                                <span class="flex-1"> Playlist Analysis </span>
                                <span
                                    class="hover:cursor-pointer"
                                    v-html="feather.icons.x.toSvg()"
                                    @click="analysisModal = false"
                                />
                            </DialogTitle>
                            <div class="mt-2">
                                <div
                                    class="mt-4 space-y-3"
                                    v-if="playlistAnalysis"
                                >
                                    <div>
                                        <h3
                                            class="text-md text-black dark:text-white mb-[0.125]"
                                        >
                                            Tracks
                                        </h3>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            There are
                                            {{ playlistAnalysis.tracks }}
                                            tracks in this playlist.
                                        </p>
                                    </div>

                                    <div>
                                        <h3
                                            class="text-md text-black dark:text-white mb-[0.125]"
                                        >
                                            Artists
                                        </h3>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            There are
                                            {{
                                                playlistAnalysis.artists.length
                                            }}
                                            artists in this playlist. The top
                                            {{
                                                Object.keys(
                                                    playlistAnalysis.topArtists
                                                ).length !== 1
                                                    ? "ones are"
                                                    : "one is"
                                            }}
                                            {{
                                                playlistAnalysis.topArtistsPretty
                                            }}.
                                        </p>
                                    </div>

                                    <div>
                                        <h3
                                            class="text-md text-black dark:text-white mb-[0.125]"
                                        >
                                            Albums
                                        </h3>
                                        <p
                                            class="text-sm text-gray-500 dark:text-gray-400"
                                        >
                                            There are
                                            {{ playlistAnalysis.albums.length }}
                                            albums in this playlist. The top
                                            {{
                                                Object.keys(
                                                    playlistAnalysis.topAlbums
                                                ).length !== 1
                                                    ? "ones are"
                                                    : "one is"
                                            }}
                                            {{
                                                playlistAnalysis.topAlbumsPretty
                                            }}.
                                        </p>
                                    </div>
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

                                        Analyzing playlist...
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
                                <span class="flex-1"> Device Selector </span>
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
                                                :aria-checked="device.is_active"
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
                                                            v-text="device.type"
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
</template>
