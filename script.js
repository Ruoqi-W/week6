/* ==========================================================================
   Personal Website - Shared interactivity
   - Mobile navigation toggle
   - Active nav link highlighting
   - Contact form client-side handling
   ========================================================================== */

(function () {
  'use strict';

  /* ----- Mobile navigation toggle ----- */
  function initNavToggle() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when a link is clicked (mobile)
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!links.contains(e.target) && !toggle.contains(e.target)) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ----- Highlight active nav link based on current page ----- */
  function initActiveNav() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });
  }

  /* ----- Contact form (client-side only) ----- */
  function initContactForm() {
    var form = document.querySelector('#contact-form');
    if (!form) return;

    var status = document.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('#name').value.trim();
      var email = form.querySelector('#email').value.trim();
      var message = form.querySelector('#message').value.trim();

      if (!name || !email || !message) {
        if (status) {
          status.textContent = 'Please fill in all fields before sending.';
          status.style.background = 'rgba(231, 111, 81, 0.12)';
          status.style.color = 'var(--color-primary)';
          status.classList.add('visible');
        }
        return;
      }

      // Basic email format check
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        if (status) {
          status.textContent = 'Please enter a valid email address.';
          status.style.background = 'rgba(231, 111, 81, 0.12)';
          status.style.color = 'var(--color-primary)';
          status.classList.add('visible');
        }
        return;
      }

      if (status) {
        status.textContent = 'Thanks, ' + name + '! Your message has been sent. I\u2019ll be in touch soon. \u2728';
        status.style.background = 'rgba(42, 157, 143, 0.12)';
        status.style.color = 'var(--color-accent)';
        status.classList.add('visible');
      }
      form.reset();
    });
  }

  /* ----- To-Do List App ----- */
  function initTodoApp() {
    var calDays = document.getElementById('cal-days');
    var calTitle = document.getElementById('cal-title');
    var calPrev = document.getElementById('cal-prev');
    var calNext = document.getElementById('cal-next');
    var todoListEl = document.getElementById('todo-list');
    var todoEmpty = document.getElementById('todo-empty');
    var todoCounter = document.getElementById('todo-counter');
    var todoInput = document.getElementById('todo-text');
    var todoAddBtn = document.getElementById('todo-add-btn');
    var todoSelectedDate = document.getElementById('todo-selected-date');
    var emojiPicker = document.getElementById('emoji-picker');
    var priorityPicker = document.getElementById('priority-picker');

    if (!calDays) return;

    var supabase = window.supabase.createClient(
      'https://exenofjgltauyjdolbue.supabase.co',
      'sb_publishable_MgiDAk3qwlDp6IyJ2lCx0g_L2_seix5'
    );

    var viewYear = new Date().getFullYear();
    var viewMonth = new Date().getMonth();
    var selectedDate = null;
    var selectedEmoji = null;
    var selectedPriority = 'medium';
    var tasks = [];

    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    var priorityRank = { high: 0, medium: 1, low: 2 };

    // Real columns in your Supabase todos table:
    // id, task, is_complete, date, created_at
    var idColumn = 'id';
    var textColumn = 'task';
    var dateColumn = 'date';
    var doneColumn = 'is_complete';
    var createdAtColumn = 'created_at';
    var emojiColumn = null;     // no such column yet — emoji kept in memory only
    var priorityColumn = null;  // no such column yet — priority kept in memory only

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function dateKey(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
    function formatDisplayDate(y, m, d) {
      return monthNames[m] + ' ' + d + ', ' + y;
    }

    function renderCalendar() {
      calTitle.textContent = monthNames[viewMonth] + ' ' + viewYear;
      calDays.innerHTML = '';
      var firstDay = new Date(viewYear, viewMonth, 1).getDay();
      var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      var prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

      for (var i = firstDay - 1; i >= 0; i--) {
        var d = prevMonthDays - i;
        calDays.appendChild(makeDayCell(d, true,
          viewMonth === 0 ? 11 : viewMonth - 1,
          viewMonth === 0 ? viewYear - 1 : viewYear));
      }
      var today = new Date();
      for (var j = 1; j <= daysInMonth; j++) {
        var cell = makeDayCell(j, false, viewMonth, viewYear);
        if (viewYear === today.getFullYear() && viewMonth === today.getMonth() && j === today.getDate()) {
          cell.classList.add('today');
        }
        if (dateHasTasks(dateKey(viewYear, viewMonth, j))) cell.classList.add('has-tasks');
        calDays.appendChild(cell);
      }
      var trailing = (7 - ((firstDay + daysInMonth) % 7)) % 7;
      for (var k = 1; k <= trailing; k++) {
        calDays.appendChild(makeDayCell(k, true,
          viewMonth === 11 ? 0 : viewMonth + 1,
          viewMonth === 11 ? viewYear + 1 : viewYear));
      }
    }

    function makeDayCell(day, otherMonth, m, y) {
      var cell = document.createElement('button');
      cell.className = 'cal-day' + (otherMonth ? ' other-month' : '');
      cell.textContent = day;
      if (selectedDate && selectedDate.year === y && selectedDate.month === m && selectedDate.day === day) {
        cell.classList.add('selected');
      }
      cell.addEventListener('click', function () {
        selectedDate = { year: y, month: m, day: day };
        if (m !== viewMonth || y !== viewYear) { viewMonth = m; viewYear = y; }
        renderCalendar();
        updateSelectedDateLabel();
        todoInput.focus();
      });
      return cell;
    }

    function dateHasTasks(key) { return tasks.some(function (t) { return t.date === key; }); }

    function updateSelectedDateLabel() {
      if (selectedDate) {
        todoSelectedDate.textContent = 'Selected: ' +
          formatDisplayDate(selectedDate.year, selectedDate.month, selectedDate.day);
      } else {
        todoSelectedDate.textContent = '';
      }
    }

    // Build a row -> task mapping using detected columns
    function rowToTask(row) {
      var task = {
        id: row[idColumn],
        text: row[textColumn] || '',
        date: row[dateColumn] || dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
        done: doneColumn ? !!row[doneColumn] : false,
        emoji: emojiColumn ? row[emojiColumn] : null,
        priority: priorityColumn ? (row[priorityColumn] || 'medium') : 'medium',
        created_at: createdAtColumn ? row[createdAtColumn] : null
      };
      // Normalize date to 'YYYY-MM-DD' if it came as full timestamp
      if (task.date && task.date.indexOf('T') !== -1) {
        task.date = task.date.split('T')[0];
      }
      return task;
    }

    // Build a task -> row payload using only available columns
    function taskToRow(task) {
      var row = {};
      if (textColumn) row[textColumn] = task.text;
      if (dateColumn) row[dateColumn] = task.date;
      if (doneColumn) row[doneColumn] = !!task.done;
      if (emojiColumn) row[emojiColumn] = task.emoji;
      if (priorityColumn) row[priorityColumn] = task.priority;
      return row;
    }

    /* ----- Verify table access ----- */
    async function checkTable() {
      try {
        var probe = await supabase.from('todos').select('id').limit(1);
        if (probe.error) {
          console.error('[Supabase] Table check failed:', probe.error.message);
          return false;
        }
        console.info('[Supabase] Connected. Columns: id, task, is_complete, date, created_at');
        return true;
      } catch (err) {
        console.error('[Supabase] Table check exception:', err);
        return false;
      }
    }

    /* ----- Probe optional columns (persist emoji/priority if they exist) ----- */
    async function probeOptionalColumns() {
      try {
        var e = await supabase.from('todos').select('emoji').limit(1);
        if (!e.error) emojiColumn = 'emoji';
      } catch (err) { /* column missing */ }
      try {
        var p = await supabase.from('todos').select('priority').limit(1);
        if (!p.error) priorityColumn = 'priority';
      } catch (err) { /* column missing */ }
      console.info('[Supabase] Optional columns -> emoji:', emojiColumn, '| priority:', priorityColumn);
    }

    /* ----- Load all tasks ordered by created_at (fallback: date) ----- */
    async function loadTasks() {
      var orderCol = createdAtColumn || dateColumn;
      var query = supabase.from('todos').select('*');
      if (orderCol) query = query.order(orderCol, { ascending: true });
      var result = await query;

      if (result.error) {
        console.error('[Supabase] Load failed:', result.error.message);
        return;
      }
      tasks = (result.data || []).map(rowToTask);
      renderTasks();
      renderCalendar();
    }

    /* ----- Add task ----- */
    async function addTask() {
      var text = todoInput.value.trim();
      if (!text) { todoInput.focus(); return; }
      if (!selectedDate) {
        var now = new Date();
        selectedDate = { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
        viewMonth = selectedDate.month; viewYear = selectedDate.year;
      }

      var task = {
        id: null,
        text: text,
        date: dateKey(selectedDate.year, selectedDate.month, selectedDate.day),
        done: false,
        emoji: selectedEmoji,
        priority: selectedPriority
      };

      var payload = taskToRow(task);
      // Drop nulls so DB column defaults apply
      Object.keys(payload).forEach(function (k) { if (payload[k] === null) delete payload[k]; });

      var result = await supabase.from('todos').insert(payload);
      if (result.error) {
        console.error('[Supabase] Add failed:', result.error.message);
        return;
      }

      // Reload from DB so the new row gets its real ID and defaults
      todoInput.value = '';
      await loadTasks();
    }

    /* ----- Toggle done ----- */
    async function toggleTask(id) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      var newDone = !task.done;
      task.done = newDone;
      renderTasks();

      if (!doneColumn) return;

      var updateObj = {};
      updateObj[doneColumn] = newDone;
      var result = await supabase.from('todos').update(updateObj).eq('id', id);
      if (result.error) {
        console.error('[Supabase] Toggle failed:', result.error.message);
        task.done = !newDone;
        renderTasks();
      }
    }

    /* ----- Delete ----- */
    async function deleteTask(id) {
      var result = await supabase.from('todos').delete().eq('id', id);
      if (result.error) {
        console.error('[Supabase] Delete failed:', result.error.message);
        return;
      }
      tasks = tasks.filter(function (t) { return t.id !== id; });
      renderTasks();
      renderCalendar();
    }

    /* ----- Edit text ----- */
    async function saveTaskText(id, newText) {
      if (!textColumn) return true; // no text column to save to
      var updateObj = {};
      updateObj[textColumn] = newText;
      var result = await supabase.from('todos').update(updateObj).eq('id', id);
      if (result.error) {
        console.error('[Supabase] Update text failed:', result.error.message);
        return false;
      }
      return true;
    }

    /* ----- Render ----- */
    function renderTasks() {
      todoListEl.innerHTML = '';
      var doneCount = tasks.filter(function (t) { return t.done; }).length;
      var totalCount = tasks.length;
      todoCounter.textContent = doneCount + ' of ' + totalCount + ' task' +
        (totalCount === 1 ? '' : 's') + ' completed';

      var sorted = tasks.slice().sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        var pr = priorityRank[a.priority] - priorityRank[b.priority];
        if (pr !== 0) return pr;
        return a.date.localeCompare(b.date);
      });

      if (sorted.length === 0) {
        todoEmpty.style.display = 'block';
        return;
      }
      todoEmpty.style.display = 'none';

      sorted.forEach(function (task) {
        var li = document.createElement('li');
        li.className = 'todo-item priority-' + task.priority + (task.done ? ' done' : '');

        if (task.emoji) {
          var emojiEl = document.createElement('span');
          emojiEl.className = 'todo-item-emoji';
          emojiEl.textContent = task.emoji;
          li.appendChild(emojiEl);
        }

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = task.done;
        checkbox.addEventListener('change', function () { toggleTask(task.id); });

        var content = document.createElement('div');
        content.className = 'todo-item-content';

        var textEl = document.createElement('div');
        textEl.className = 'todo-item-text';
        textEl.textContent = task.text;
        textEl.setAttribute('role', 'button');
        textEl.setAttribute('tabindex', '0');
        textEl.setAttribute('title', 'Click to edit');
        textEl.addEventListener('click', function () { startEdit(task.id, textEl); });
        textEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); startEdit(task.id, textEl); }
        });

        var metaRow = document.createElement('div');
        metaRow.className = 'todo-item-meta';

        var dateEl = document.createElement('span');
        dateEl.className = 'todo-item-date';
        var parts = task.date.split('-');
        dateEl.textContent = formatDisplayDate(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

        var priorityLabel = document.createElement('span');
        priorityLabel.className = 'todo-item-priority pri-' + task.priority;
        priorityLabel.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

        metaRow.appendChild(dateEl);
        metaRow.appendChild(priorityLabel);

        content.appendChild(textEl);
        content.appendChild(metaRow);

        var delBtn = document.createElement('button');
        delBtn.className = 'todo-delete';
        delBtn.setAttribute('aria-label', 'Delete task');
        delBtn.innerHTML = '&times;';
        delBtn.addEventListener('click', function () { deleteTask(task.id); });

        li.appendChild(checkbox);
        li.appendChild(content);
        li.appendChild(delBtn);
        todoListEl.appendChild(li);
      });
    }

    function startEdit(id, textEl) {
      var task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      if (textEl.classList.contains('editing')) return;

      var originalText = task.text;
      textEl.classList.add('editing');
      textEl.setAttribute('contenteditable', 'true');
      textEl.focus();

      var range = document.createRange();
      range.selectNodeContents(textEl);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      var finished = false;
      async function finish(save) {
        if (finished) return;
        finished = true;
        textEl.removeAttribute('contenteditable');
        textEl.classList.remove('editing');
        textEl.removeEventListener('blur', onBlur);
        textEl.removeEventListener('keydown', onKey);

        var newText = textEl.textContent.trim();
        if (save && newText && newText !== originalText) {
          textEl.textContent = newText;
          var ok = await saveTaskText(id, newText);
          if (ok) {
            task.text = newText;
          } else {
            textEl.textContent = originalText;
          }
        } else {
          textEl.textContent = originalText;
        }
      }

      function onBlur() { finish(true); }
      function onKey(e) {
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      }

      textEl.addEventListener('blur', onBlur);
      textEl.addEventListener('keydown', onKey);
    }

    // Event listeners
    calPrev.addEventListener('click', function () {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      renderCalendar();
    });
    calNext.addEventListener('click', function () {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar();
    });
    todoAddBtn.addEventListener('click', addTask);
    todoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addTask();
    });

    emojiPicker.addEventListener('click', function (e) {
      var btn = e.target.closest('.emoji-btn');
      if (!btn) return;
      var emoji = btn.getAttribute('data-emoji');
      if (selectedEmoji === emoji) {
        selectedEmoji = null;
        btn.classList.remove('selected');
      } else {
        selectedEmoji = emoji;
        emojiPicker.querySelectorAll('.emoji-btn').forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
      }
    });

    priorityPicker.addEventListener('click', function (e) {
      var btn = e.target.closest('.priority-btn');
      if (!btn) return;
      selectedPriority = btn.getAttribute('data-priority');
      priorityPicker.querySelectorAll('.priority-btn').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });

    // Start: calendar immediately, then check the table and load from DB
    renderCalendar();
    checkTable().then(async function (ok) {
      if (ok) {
        await probeOptionalColumns();
        loadTasks();
      } else {
        todoEmpty.textContent = 'Could not connect to todos table. ' +
          'Check console (F12) for details.';
        todoEmpty.style.display = 'block';
      }
    });
  }

  /* ----- Weather App ----- */
  function initWeatherApp() {
    var input = document.getElementById('weather-city');
    var btn = document.getElementById('weather-search-btn');
    var result = document.getElementById('weather-result');
    if (!input || !btn || !result) return;

    var toggle = document.getElementById('weather-toggle');
    var API_URL = 'https://uapis.cn/api/v1/misc/weather';
    var currentUnit = 'C';
    var lastData = null;

    var iconMap = {
      '100': { e: '\u2600\uFE0F', l: 'Clear' },
      '101': { e: '\u26C5', l: 'Partly Cloudy' },
      '102': { e: '\u26C5', l: 'Partly Cloudy' },
      '103': { e: '\uD83C\uDF25\uFE0F', l: 'Mostly Cloudy' },
      '104': { e: '\u2601\uFE0F', l: 'Overcast' },
      '150': { e: '\uD83C\uDF19', l: 'Clear' },
      '151': { e: '\uD83C\uDF19\u2601', l: 'Partly Cloudy' },
      '152': { e: '\uD83C\uDF19\u2601', l: 'Mostly Cloudy' },
      '153': { e: '\u2601\uFE0F', l: 'Overcast' },
      '300': { e: '\uD83C\uDF26\uFE0F', l: 'Shower Rain' },
      '301': { e: '\uD83C\uDF26\uFE0F', l: 'Heavy Shower' },
      '302': { e: '\u26C8\uFE0F', l: 'Thunderstorm' },
      '303': { e: '\u26C8\uFE0F', l: 'Heavy Thunderstorm' },
      '304': { e: '\uD83C\uDF28\uFE0F', l: 'Hail' },
      '305': { e: '\uD83C\uDF27\uFE0F', l: 'Light Rain' },
      '306': { e: '\uD83C\uDF27\uFE0F', l: 'Moderate Rain' },
      '307': { e: '\uD83C\uDF27\uFE0F', l: 'Heavy Rain' },
      '308': { e: '\uD83C\uDF27\uFE0F', l: 'Extreme Rain' },
      '309': { e: '\uD83C\uDF26\uFE0F', l: 'Drizzle' },
      '310': { e: '\u26C8\uFE0F', l: 'Storm' },
      '311': { e: '\u26C8\uFE0F', l: 'Heavy Storm' },
      '312': { e: '\u26C8\uFE0F', l: 'Severe Storm' },
      '313': { e: '\uD83C\uDF27\uFE0F', l: 'Freezing Rain' },
      '400': { e: '\uD83C\uDF28\uFE0F', l: 'Light Snow' },
      '401': { e: '\uD83C\uDF28\uFE0F', l: 'Moderate Snow' },
      '402': { e: '\u2744\uFE0F', l: 'Heavy Snow' },
      '403': { e: '\uD83C\uDF28\uFE0F', l: 'Blizzard' },
      '404': { e: '\uD83C\uDF27\uFE0F', l: 'Sleet' },
      '405': { e: '\uD83C\uDF27\uFE0F', l: 'Rain and Snow' },
      '406': { e: '\uD83C\uDF28\uFE0F', l: 'Shower Snow' },
      '407': { e: '\uD83C\uDF28\uFE0F', l: 'Sleet' },
      '500': { e: '\uD83C\uDF2B\uFE0F', l: 'Fog' },
      '501': { e: '\uD83C\uDF2B\uFE0F', l: 'Mist' },
      '502': { e: '\uD83D\uDE37', l: 'Haze' },
      '503': { e: '\uD83D\uDE36', l: 'Dust' },
      '504': { e: '\uD83C\uDF2B\uFE0F', l: 'Sandstorm' },
      '507': { e: '\uD83C\uDF2B\uFE0F', l: 'Dust Storm' },
      '508': { e: '\uD83C\uDF2B\uFE0F', l: 'Severe Sandstorm' },
      '900': { e: '\uD83E\uDD75', l: 'Hot' },
      '901': { e: '\uD83E\uDD76', l: 'Cold' }
    };

    function esc(s) {
      var d = document.createElement('div');
      d.textContent = s == null ? '' : String(s);
      return d.innerHTML;
    }

    function mapWeatherText(text) {
      if (!text) return { e: '\uD83C\uDF21\uFE0F', l: '\u2014' };
      var t = String(text);
      if (t.indexOf('\u96F7') !== -1) return { e: '\u26C8\uFE0F', l: 'Thunderstorm' };
      if (t.indexOf('\u66B4\u96E8') !== -1) return { e: '\uD83C\uDF27\uFE0F', l: 'Rainstorm' };
      if (t.indexOf('\u5927\u96E8') !== -1) return { e: '\uD83C\uDF27\uFE0F', l: 'Heavy Rain' };
      if (t.indexOf('\u4E2D\u96E8') !== -1) return { e: '\uD83C\uDF27\uFE0F', l: 'Moderate Rain' };
      if (t.indexOf('\u5C0F\u96E8') !== -1 || t.indexOf('\u9635\u96E8') !== -1) return { e: '\uD83C\uDF26\uFE0F', l: 'Light Rain' };
      if (t.indexOf('\u96E8') !== -1) return { e: '\uD83C\uDF27\uFE0F', l: 'Rain' };
      if (t.indexOf('\u66B4\u96EA') !== -1) return { e: '\u2744\uFE0F', l: 'Blizzard' };
      if (t.indexOf('\u5927\u96EA') !== -1) return { e: '\u2744\uFE0F', l: 'Heavy Snow' };
      if (t.indexOf('\u4E2D\u96EA') !== -1) return { e: '\uD83C\uDF28\uFE0F', l: 'Moderate Snow' };
      if (t.indexOf('\u5C0F\u96EA') !== -1) return { e: '\uD83C\uDF28\uFE0F', l: 'Light Snow' };
      if (t.indexOf('\u5939\u96EA') !== -1) return { e: '\uD83C\uDF27\uFE0F', l: 'Sleet' };
      if (t.indexOf('\u96EA') !== -1) return { e: '\uD83C\uDF28\uFE0F', l: 'Snow' };
      if (t.indexOf('\u96FE') !== -1 || t.indexOf('\u972D') !== -1) return { e: '\uD83C\uDF2B\uFE0F', l: 'Fog' };
      if (t.indexOf('\u973E') !== -1) return { e: '\uD83D\uDE37', l: 'Haze' };
      if (t.indexOf('\u6C99') !== -1 || t.indexOf('\u5C18') !== -1) return { e: '\uD83C\uDF2B\uFE0F', l: 'Dust' };
      if (t.indexOf('\u591A\u4E91') !== -1) return { e: '\u26C5', l: 'Partly Cloudy' };
      if (t.indexOf('\u9634') !== -1) return { e: '\u2601\uFE0F', l: 'Overcast' };
      if (t.indexOf('\u6674') !== -1) return { e: '\u2600\uFE0F', l: 'Clear' };
      return { e: '\uD83C\uDF21\uFE0F', l: text };
    }

    function show(html) { result.innerHTML = html; }

    function showMsg(msg, cls) {
      show('<p class="' + (cls || 'weather-placeholder') + '">' + esc(msg) + '</p>');
    }

    function formatTemp(c) {
      if (currentUnit === 'F') return Math.round(c * 9 / 5 + 32) + '\u00B0F';
      return c + '\u00B0C';
    }

    function formatTempNum(c) {
      if (currentUnit === 'F') return Math.round(c * 9 / 5 + 32) + '\u00B0';
      return c + '\u00B0';
    }

    function formatDateShort(dateStr) {
      var d = new Date(dateStr + 'T00:00:00');
      var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return dayNames[d.getDay()] + ' ' + monthNames[d.getMonth()] + ' ' + d.getDate();
    }

    function renderWeather(data) {
      var ic = iconMap[String(data.weather_icon)];
      var emoji = ic ? ic.e : '\uD83C\uDF21\uFE0F';
      var label = ic ? ic.l : (data.weather || 'Unknown');

      var forecastHtml = '';
      if (data.forecast && data.forecast.length > 1) {
        var days = data.forecast.slice(1, 4);
        forecastHtml = '<div class="weather-forecast">' +
          days.map(function (d) {
            var w = mapWeatherText(d.weather_day);
            return '<div class="forecast-day">' +
              '<div class="forecast-date">' + esc(formatDateShort(d.date)) + '</div>' +
              '<div class="forecast-icon">' + w.e + '</div>' +
              '<div class="forecast-cond">' + esc(w.l) + '</div>' +
              '<div class="forecast-temps">' +
                '<span class="forecast-high">' + formatTempNum(d.temp_max) + '</span>' +
                '<span class="forecast-sep">/</span>' +
                '<span class="forecast-low">' + formatTempNum(d.temp_min) + '</span>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      show(
        '<div class="weather-info">' +
          '<div class="weather-icon">' + emoji + '</div>' +
          '<div class="weather-details">' +
            '<h3 class="weather-city">' + esc(data.city) + '</h3>' +
            '<div class="weather-temp">' + formatTemp(data.temperature) + '</div>' +
            '<div class="weather-condition">' + esc(label) + '</div>' +
          '</div>' +
        '</div>' +
        forecastHtml
      );
    }

    function handleData(data) {
      if (data.error || !data.city) {
        lastData = null;
        showMsg("Couldn\u2019t find that city \u2014 check the spelling.", 'weather-error');
        return;
      }
      lastData = data;
      renderWeather(data);
    }

    async function search() {
      var city = input.value.trim();
      if (!city) {
        showMsg('Enter a city first.', 'weather-error');
        return;
      }
      showMsg('Loading\u2026', 'weather-loading');
      var targetUrl = API_URL + '?city=' + encodeURIComponent(city) + '&forecast=true';
      try {
        var res = await fetch(targetUrl);
        handleData(await res.json());
      } catch (err) {
        try {
          var proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);
          var res2 = await fetch(proxyUrl);
          handleData(await res2.json());
        } catch (err2) {
          lastData = null;
          showMsg("Couldn\u2019t reach the weather service. Please try again.", 'weather-error');
        }
      }
    }

    btn.addEventListener('click', search);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') search();
    });
    if (toggle) {
      toggle.addEventListener('click', function () {
        currentUnit = currentUnit === 'C' ? 'F' : 'C';
        toggle.textContent = '\u00B0' + currentUnit;
        if (lastData) renderWeather(lastData);
      });
    }
  }

  /* ----- World Time App ----- */
  function initWorldTimeApp() {
    var input = document.getElementById('wt-city');
    var btn = document.getElementById('wt-search-btn');
    var result = document.getElementById('wt-result');
    if (!input || !btn || !result) return;

    var API_URL = 'https://uapis.cn/api/v1/misc/worldtime';
    var quickBtns = document.querySelectorAll('.worldtime-quick .chip');
    var suggBox = document.getElementById('wt-suggestions');

    var cityDB = [
      { api: 'Beijing',     display: 'Beijing',       region: 'China',       tz: 'UTC+8' },
      { api: 'Shanghai',    display: 'Shanghai',      region: 'China',       tz: 'UTC+8' },
      { api: 'HongKong',    display: 'Hong Kong',     region: 'China',       tz: 'UTC+8' },
      { api: 'Singapore',   display: 'Singapore',     region: 'Singapore',   tz: 'UTC+8' },
      { api: 'Tokyo',       display: 'Tokyo',         region: 'Japan',       tz: 'UTC+9' },
      { api: 'Dubai',       display: 'Dubai',         region: 'UAE',         tz: 'UTC+4' },
      { api: 'Moscow',      display: 'Moscow',       region: 'Russia',      tz: 'UTC+3' },
      { api: 'Paris',       display: 'Paris',         region: 'France',     tz: 'UTC+1' },
      { api: 'London',      display: 'London',        region: 'UK',          tz: 'UTC+0' },
      { api: 'Berlin',      display: 'Berlin',        region: 'Germany',     tz: 'UTC+1' },
      { api: 'NewYork',     display: 'New York',      region: 'USA',         tz: 'UTC-5' },
      { api: 'Toronto',     display: 'Toronto',       region: 'Canada',      tz: 'UTC-5' },
      { api: 'Chicago',     display: 'Chicago',       region: 'USA',         tz: 'UTC-6' },
      { api: 'LosAngeles',  display: 'Los Angeles',   region: 'USA',         tz: 'UTC-8' },
      { api: 'Sydney',      display: 'Sydney',        region: 'Australia',   tz: 'UTC+11' }
    ];

    function findCities(query) {
      var q = query.toLowerCase().replace(/\s/g, '');
      if (!q) return [];
      return cityDB.filter(function (c) {
        var name = c.api.toLowerCase().replace(/\s/g, '');
        var disp = c.display.toLowerCase().replace(/\s/g, '');
        return name.indexOf(q) !== -1 || disp.indexOf(q) !== -1;
      });
    }

    function showSuggestions(query) {
      if (!suggBox) return;
      var matches = findCities(query);
      if (matches.length === 0) {
        suggBox.innerHTML = '';
        suggBox.style.display = 'none';
        return;
      }
      suggBox.innerHTML = matches.map(function (c) {
        return '<button class="wt-suggestion" data-api="' + esc(c.api) + '">' +
          '<span class="wt-sugg-name">' + esc(c.display) + '</span>' +
          '<span class="wt-sugg-region">' + esc(c.region) + '</span>' +
          '<span class="wt-sugg-tz">' + esc(c.tz) + '</span>' +
        '</button>';
      }).join('');
      suggBox.style.display = 'block';
      suggBox.querySelectorAll('.wt-suggestion').forEach(function (btn) {
        btn.addEventListener('click', function () {
          input.value = btn.getAttribute('data-api');
          suggBox.innerHTML = '';
          suggBox.style.display = 'none';
          search();
        });
      });
    }

    function esc(s) {
      var d = document.createElement('div');
      d.textContent = s == null ? '' : String(s);
      return d.innerHTML;
    }

    function show(html) { result.innerHTML = html; }

    function showMsg(msg, cls) {
      show('<p class="' + (cls || 'worldtime-placeholder') + '">' + esc(msg) + '</p>');
    }

    var clockTimer = null;

    function clearClock() {
      if (clockTimer) { clearTimeout(clockTimer); clockTimer = null; }
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function startClock(baseTs) {
      clearClock();
      var fetchMs = Date.now();
      function tick() {
        var el = result.querySelector('.worldtime-clock');
        if (!el) { clearClock(); return; }
        var d = new Date(baseTs + (Date.now() - fetchMs));
        el.textContent = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
        clockTimer = setTimeout(tick, 1000);
      }
      tick();
    }

    function handleData(data) {
      if (data.error) {
        clearClock();
        showMsg("Couldn\u2019t find that city \u2014 check the spelling.", 'worldtime-error');
        return;
      }
      var dt = String(data.datetime || '');
      var datePart = dt.split(' ')[0] || '';
      var timePart = dt.split(' ')[1] || '';
      var offset = String(data.offset_string || 'UTC');
      if (offset.indexOf('-') === -1 && offset.indexOf('+') === -1) {
        offset = offset.replace('UTC', 'UTC+');
      }
      show(
        '<div class="worldtime-info">' +
          '<div class="worldtime-clock" id="wt-clock">' + esc(timePart) + '</div>' +
          '<div class="worldtime-city">' + esc(data.query || '') + '</div>' +
          '<div class="worldtime-meta">' +
            '<span>' + esc(data.weekday || '') + '</span>' +
            '<span>' + esc(datePart) + '</span>' +
            '<span>' + esc(data.timezone || '') + '</span>' +
            '<span>' + esc(offset) + '</span>' +
          '</div>' +
        '</div>'
      );
      var baseTs = (Number(data.timestamp_unix) + Number(data.offset_seconds)) * 1000;
      startClock(baseTs);
    }

    async function search() {
      var city = input.value.trim();
      if (!city) {
        clearClock();
        showMsg('Enter a city first.', 'worldtime-error');
        return;
      }
      clearClock();
      showMsg('Loading\u2026', 'worldtime-loading');
      var targetUrl = API_URL + '?city=' + encodeURIComponent(city);
      try {
        var res = await fetch(targetUrl);
        handleData(await res.json());
      } catch (err) {
        try {
          var proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);
          var res2 = await fetch(proxyUrl);
          handleData(await res2.json());
        } catch (err2) {
          showMsg("Couldn\u2019t reach the time service. Please try again.", 'worldtime-error');
        }
      }
    }

    btn.addEventListener('click', search);
    input.addEventListener('input', function () {
      showSuggestions(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        suggBox.innerHTML = '';
        suggBox.style.display = 'none';
        search();
      }
    });
    input.addEventListener('blur', function () {
      setTimeout(function () {
        suggBox.innerHTML = '';
        suggBox.style.display = 'none';
      }, 200);
    });
    quickBtns.forEach(function (chip) {
      chip.addEventListener('click', function () {
        input.value = chip.getAttribute('data-city');
        search();
      });
    });
  }

  /* ----- Init on DOM ready ----- */
  document.addEventListener('DOMContentLoaded', function () {
    initNavToggle();
    initActiveNav();
    initContactForm();
    initTodoApp();
    initWeatherApp();
    initWorldTimeApp();
  });
})();
