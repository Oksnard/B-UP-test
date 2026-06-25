<template>
  <div class="app">
    <header class="app__header">
      <h1>Учёт оплат и закрывающих документов</h1>
      <nav class="app__nav">
        <NuxtLink to="/">Оплаты</NuxtLink>
        <NuxtLink to="/projects">Проекты</NuxtLink>
        <NuxtLink to="/expenses">Расходы</NuxtLink>
      </nav>
    </header>
    <main class="app__main"><NuxtPage /></main>
  </div>
</template>
