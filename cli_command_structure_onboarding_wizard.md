Start with **CLI command structure first**, then build the onboarding wizard.

### Why this order matters

## 1. CLI command structure = product foundation

Your onboarding wizard is just a guided layer on top of core commands.

If the CLI core is weak:

* onboarding breaks
* shell hooks fail
* users lose trust

You need stable commands first:

* `recall init`
* `recall hook capture`
* `recall search`
* `recall recent`
* `recall project`
* `recall forgotten-tools`
* `recall uninstall`

This defines:

* internal architecture
* DB interactions
* shell hook payloads

### Build first:

* command parser / router
* config file system
* db service
* output formatting

---

## 2. Onboarding wizard should showcase real value

A wizard should not just install hooks.

It should:

* detect shell
* install hook
* import history
* show instant insights

That requires:

* search working
* history imported
* tools scanned

Otherwise:
wizard feels fake.

---

# Best execution order

## Week 1:

### Step 1: CLI command structure

Build:

* command routing
* sqlite service
* shell capture command
* search command

### Step 2: shell hook capture

Build:

* zsh hook
* command event payload

## Week 2:

### Step 3: onboarding wizard

Build:

* install flow
* hook setup
* import history
* first wow screen

---

# Exact CLI structure to define now

```bash
recall init
recall hook capture
recall search <query>
recall recent
recall project
recall forgotten-tools
recall uninstall
recall doctor
```

### Important:

Add:

## `recall doctor`

This helps:

* debug install
* shell hook issues
* permissions

Huge support saver.

---

# My recommendation:

## Build in this order:

### 1. CLI structure

### 2. shell hook capture

### 3. search + DB

### 4. onboarding wizard

That gives you:

* real foundation
* smoother UX
* fewer bugs

Do not start with the wizard. It’s tempting, but it’s lipstick without a working engine.
