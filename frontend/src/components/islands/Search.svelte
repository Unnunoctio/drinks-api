<script lang="ts">
    import ApiPetition from "./ApiPetition.svelte";

    export let urlPath: string;

    let urlActive = "beers";
    let urlPetition = `${urlPath}${urlActive}`;

    function submit() {
        urlPetition = `${urlPath}${urlActive}`;
    }

    function changeInput(value: string) {
        urlActive = value;
        submit();
    }
</script>

<form on:submit|preventDefault={submit} class="flex flex-col sm:flex-row gap-2 sm:gap-0">
    <section class="flex flex-1 text-[14px] xs:text-base items-center">
        <label for="url-input" class="p-2 bg-slate-200 rounded-l-lg border border-slate-200">{urlPath}</label>
        <input
            bind:value={urlActive}
            id="url-input"
            name="url-input"
            type="text"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            class="flex-1 p-2 min-w-30 border border-l-0 sm:border-x-0 border-slate-200 rounded-r-lg sm:rounded-r-none outline-none bg-slate-50"
        />
    </section>
    <button class="px-8 py-2 cursor-pointer font-bold text-slate-50 bg-violet-500 hover:bg-violet-600 rounded-lg sm:rounded-l-none transition-colors">Enviar</button>
</form>

<section class="mt-10">
    <div class="h-150 overflow-auto rounded-lg bg-[#24292e]">
        <ApiPetition url={urlPetition} />
    </div>
</section>

