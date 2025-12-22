<script lang="ts">
    export let url;

    const get = async (url: string) => {
        const res = await fetch(url)
        return await res.json()
    }
</script>

{#await get(url)}
    <pre class="text-sm">
<code>Loading...</code>
    </pre>
{:then json} 
    <pre class="text-sm">
<code>{JSON.stringify(json, null, 4)}</code>
    </pre>
{/await}