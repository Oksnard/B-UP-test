<template>
  <div class="app">
    <header class="app__header">
      <div class="app__brand">
        <span class="app__brand-mark" aria-hidden="true">Б</span>
        <h1 class="app__title">Учёт оплат и закрывающих документов</h1>
      </div>
      <nav class="app__nav">
        <NuxtLink to="/">Оплаты</NuxtLink>
        <NuxtLink to="/projects">Проекты</NuxtLink>
        <NuxtLink to="/expenses">Расходы</NuxtLink>
      </nav>
    </header>
    <main class="app__main"><NuxtPage /></main>
  </div>
</template>
