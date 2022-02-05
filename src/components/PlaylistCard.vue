<script setup lang="ts">
const props = defineProps<{
    playlistId: string;
    name: string;
    href: string;
    description: string | null;
}>();

const stripHTML = (content: string): string => {
    let temporaryElement = document.createElement("div");
    temporaryElement.innerHTML = content;

    return temporaryElement.textContent || temporaryElement.innerText || "";
};
</script>

<template>
    <router-link
        :to="`/playlists/${props.playlistId}`"
        class="w-full bg-white dark:bg-gray-900 rounded-lg shadow divide-y divide-gray-200"
    >
        <div class="w-full flex items-center justify-between p-6 space-x-6">
            <div class="flex-1">
                <h3
                    class="text-gray-900 dark:text-white text-md font-medium"
                    v-text="props.name"
                />
                <p
                    class="mt-2 text-gray-500 dark:text-gray-400 text-sm whitespace-normal break-words"
                    v-text="stripHTML(props.description)"
                    v-if="props.description"
                />

                <div
                    class="mt-4 items-center justify-center text-gray-500 dark:text-gray-400 text-sm"
                >
                    <a
                        :href="props.href"
                        class="hover:text-gray-600 dark:hover:text-gray-300 pl-0 p-6"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span> View on Spotify </span>
                    </a>
                </div>
            </div>
        </div>
    </router-link>
</template>
