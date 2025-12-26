<script lang="js">
    import { JsonViewer } from '@kaifronsdal/svelte-json-viewer';

    export let url;

    const get = async (url) => {
        const res = await fetch(url)
        return await res.json()
    }
</script>

{#await get(url)}
    <JsonViewer value={{ loading: true }} theme="dark" />
{:then json} 
    <JsonViewer value={json} theme="dark" />
{/await}