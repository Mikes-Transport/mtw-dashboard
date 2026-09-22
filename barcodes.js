'use strict';

console.log("YOUOK ABAASD");

(function () {

const LABEL = '.barcode-text-input-wrapper';

const TEMPLATES = {
standard: {
name: 'x2 Label Template',
panel: '.standard-barcode',
grid: '.barcode-standard-grid',
capacity: 2
},

medium: {
name: 'x8 Label Template',
panel: '.medium-barcode',
grid: '.barcode-medium-grid',
capacity: 8
},

large: {
name: 'x10 Label Template',
panel: '.large-barcode',
grid: '.barcode-large-grid',
capacity: 10
},

xlarge: {
name: 'x30 Label Template',
panel: '.xlarge-barcode',
grid: '.barcode-xlarge-grid',
capacity: 30
}
};

const FONT_URLS = [
'https://raw.githack.com/Mikes-Transport/mtw-dashboard/main/IDAutomationHC39M%20Free%20Version.ttf',
'https://rawcdn.githack.com/Mikes-Transport/mtw-dashboard/main/IDAutomationHC39M%20Free%20Version.ttf',
'https://raw.githubusercontent.com/Mikes-Transport/mtw-dashboard/main/IDAutomationHC39M%20Free%20Version.ttf'
];

const DROPDOWN_OPEN_CLASS = 'barcode-dropdown-open';

const TEMPLATE_DEFAULTS = {

standard: {
partNumberSize: 115,
subtextSize: 43,
barcodeSize: 50
},

medium: {
partNumberSize: 50,
subtextSize: 20,
barcodeSize: 25
},

large: {
partNumberSize: 50,
subtextSize: 20,
barcodeSize: 20
},

xlarge: {
partNumberSize: 18,
subtextSize: 8,
barcodeSize: 13
}

};

const DEFAULTS = {
template: 'standard',
partNumber: '',
subtext: '',
...TEMPLATE_DEFAULTS.standard
};

const state = {
current: null,
cards: []
};

let counter = 0;
let editing = null;
let ready = false;

const $ = s => document.querySelector(s);

const els = {};
const sources = {};

function getTemplateDefaults(template) {

return (
TEMPLATE_DEFAULTS[template] ||
TEMPLATE_DEFAULTS.standard
);

}

function getSource(templateId) {

const config =
TEMPLATES[templateId] ||
TEMPLATES.standard;

if (sources[config.panel]) {
return sources[config.panel];
}

const panel =
document.querySelector(config.panel);

if (!panel) {
return null;
}

const page =
panel.querySelector(
'.barcode-page:not([data-generated])'
);

if (!page) {
return null;
}

const label =
page.querySelector(
LABEL + ':not(.barcode-card)'
);

if (!label) {
return null;
}

const pageCopy =
page.cloneNode(true);

const labelCopy =
label.cloneNode(true);

pageCopy.removeAttribute('id');
labelCopy.removeAttribute('id');

pageCopy
.querySelectorAll('[id]')
.forEach(
e => e.removeAttribute('id')
);

labelCopy
.querySelectorAll('[id]')
.forEach(
e => e.removeAttribute('id')
);

sources[config.panel] = {
page: pageCopy,
label: labelCopy
};

return sources[config.panel];

}

function cacheSources() {

Object.keys(TEMPLATES).forEach(
id => getSource(id)
);

}

function describe(el) {

const cs =
getComputedStyle(el);

const cls =
typeof el.className === 'string' &&
el.className.trim()
? '.' +
el.className.trim()
.split(/\s+/)
.join('.')
: '';

return (
el.tagName.toLowerCase() +
cls +
' [display:' +
cs.display +
' visibility:' +
cs.visibility +
' opacity:' +
cs.opacity +
' height:' +
Math.round(
el.getBoundingClientRect().height
) +
'px]'
);

}

function diagnose() {

console.group('[barcode] diagnose');

console.log(
'current template:',
state.current
);

console.log(
'barcode font faces:',
document.fonts
? [...document.fonts]
.filter(
f =>
f.family.replace(
/["']/g,
''
) === 'IDAutomationHC39M'
)
.map(f => f.status)
: 'document.fonts unavailable'
);

console.log(
'elements found:',
{
panel: !!els.panel,
pages: !!els.pages,
left: !!els.left,
menu: !!els.menu,
dropdown: !!els.dropdown,
importCSV: !!els.importCSV
}
);

Object.entries(TEMPLATES).forEach(
([id, t]) => {

const panel =
document.querySelector(
t.panel
);

console.log(
id + ' ' + t.panel,
'| panel elements:',
document.querySelectorAll(
t.panel
).length,
'| page+label cached:',
!!sources[t.panel],
'| cards:',
state.cards.filter(
c => c.template === id
).length,
'| generated pages:',
panel
? panel.querySelectorAll(
'.barcode-page[data-generated]'
).length
: 0,
'| panel display:',
panel
? getComputedStyle(
panel
).display
: 'n/a'
);

}
);

const labels =
els.panel
? els.panel.querySelectorAll(
'.barcode-card'
)
: [];

console.log(
'labels rendered (.barcode-card):',
labels.length
);

const probe =
labels[0] || els.panel;

if (probe) {

console.log(
'chain from first label up to <html>:'
);

for (
let n = probe;
n && n !== document.documentElement;
n = n.parentElement
) {

console.log(
'   ' + describe(n)
);

}

}

console.groupEnd();

}

function unhide(el, display) {

if (!el) return;

if (
getComputedStyle(el).display ===
'none'
) {

el.style.setProperty(
'display',
display,
'important'
);

}

}

function findDropdown() {

const drop =
$('#barcode-drop');

if (!drop) {

return $(
'.db-list-dropdown-wrapper'
);

}

return (
drop.querySelector(
'.db-list-dropdown-wrapper'
) ||
drop.closest(
'.db-list-dropdown-wrapper'
) ||
(
drop.nextElementSibling &&
drop.nextElementSibling.matches(
'.db-list-dropdown-wrapper'
)
? drop.nextElementSibling
: null
) ||
$('.db-list-dropdown-wrapper')
);

}

function cache() {

els.panel =
$('.barcode-label-panels');

els.add =
$('.barcode-add-card-button');

els.print =
$('.barcode-print-card-button');

els.importCSV =
$('.barcode-import-card-button');

els.dropdown =
findDropdown();

els.pages =
$('.barcode-page-wrapper');

els.left =
$('.db-left-content');

els.menu =
$('.db-menu-list');

}

function openBarcodePanel() {

if (!els.panel) return;

els.panel.classList.add('open');

els.panel.style.removeProperty(
'display'
);

if (
getComputedStyle(
els.panel
).display === 'none'
) {

els.panel.style.setProperty(
'display',
'block',
'important'
);

}

}

function closeBarcodePanel() {

if (!els.panel) return;

els.panel.classList.remove('open');

els.panel.style.removeProperty(
'display'
);

}

function loadBarcodeFont(index = 0) {

if (
typeof FontFace === 'undefined' ||
!document.fonts
) {

return;

}

if (
index >= FONT_URLS.length
) {

console.error(
'[barcode] barcode font FAILED to load from every URL:',
FONT_URLS
);

return;

}

const url =
FONT_URLS[index];

const face =
new FontFace(
'IDAutomationHC39M',
'url("' +
url +
'") format("truetype")',
{
display: 'block'
}
);

face
.load()
.then(
loaded => {

document.fonts.add(
loaded
);

console.log(
'[barcode] barcode font loaded from ' +
url
);

}
)
.catch(
err => {

console.warn(
'[barcode] barcode font failed from ' +
url +
' - trying next source.',
err
);

loadBarcodeFont(
index + 1
);

}
);

}

function injectStyles() {

if ($('#barcode-tool-styles')) {
return;
}

const style =
document.createElement('style');

style.id =
'barcode-tool-styles';

style.textContent = `

.db-list-dropdown-wrapper:not(.${DROPDOWN_OPEN_CLASS})
.db-list-dropdown-card[data-barcode-template] {
display: none !important;
}

.db-list-dropdown-card[data-barcode-template] {
cursor: pointer;
}

.barcode-card {
position: relative;
}

.barcode-card-overlay {
position: absolute;
inset: 0;
z-index: 20;
cursor: pointer;
}

.barcode-populate {
display: block !important;
width: auto !important;
max-width: none !important;
box-sizing: content-box !important;
font-family: 'IDAutomationHC39M', monospace !important;
white-space: nowrap;
text-align: center;
overflow: visible !important;
flex-shrink: 0;
position: relative;
z-index: 1;
margin-top: 4px;
margin-bottom: 0;
}

.barcode-populate-auto {
text-align: center;
}

.barcode-card .barcode-populate {
align-self: center;
}

.db-left-content.editing {
width: 100% !important;
height: calc(100vh - 120px) !important;
min-height: 0 !important;
max-height: calc(100vh - 120px) !important;
overflow: hidden !important;
display: flex !important;
flex-direction: column !important;
overscroll-behavior: contain !important;
}

.db-left-content.editing .barcode-edit-panel {
flex: 1 1 auto !important;
width: 100% !important;
height: auto !important;
min-height: 0 !important;
max-height: none !important;
overflow-y: auto !important;
overflow-x: hidden !important;
box-sizing: border-box !important;
padding-right: 10px !important;
overscroll-behavior: contain !important;
-webkit-overflow-scrolling: touch !important;
scrollbar-width: thin;
touch-action: pan-y;
}

.barcode-edit-panel::-webkit-scrollbar {
width: 6px;
}

.barcode-edit-panel::-webkit-scrollbar-track {
background: transparent;
}

.barcode-edit-panel::-webkit-scrollbar-thumb {
background: #ccc;
border-radius: 10px;
}

.barcode-edit-panel::-webkit-scrollbar-thumb:hover {
background: #aaa;
}

.barcode-edit-panel-header {
display: flex;
justify-content: space-between;
align-items: center;
flex: 0 0 auto;
margin-bottom: 16px;
padding-bottom: 12px;
border-bottom: 1px solid #eee;
}

.barcode-edit-panel-title {
font-weight: 700;
font-size: 18px;
}

.barcode-edit-panel-close {
border: 0;
background: none;
font-size: 24px;
cursor: pointer;
line-height: 1;
}

.barcode-edit-section {
border-top: 1px solid #eee;
padding-top: 16px;
margin-top: 16px;
}

.barcode-edit-section-title {
font-size: 11px;
font-weight: 700;
text-transform: uppercase;
margin-bottom: 12px;
}

.barcode-field-group {
margin-bottom: 12px;
}

.barcode-field-label,
.barcode-control-label {
display: block;
font-size: 11px;
font-weight: 600;
color: #444;
margin-bottom: 5px;
}

.barcode-field-input {
width: 100%;
box-sizing: border-box;
padding: 8px;
border: 1px solid #ccc;
border-radius: 5px;
font: inherit;
font-size: 12px;
}

.barcode-control-row {
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
margin-bottom: 8px;
}

.barcode-control {
min-width: 120px;
padding: 6px;
border: 1px solid #ccc;
border-radius: 5px;
background: #fff;
font: inherit;
font-size: 11px;
}

.barcode-number {
width: 80px;
min-width: 80px;
}

.barcode-edit-panel-footer {
display: flex;
justify-content: flex-end;
align-items: center;
gap: 8px;
margin-top: 18px;
padding-top: 14px;
border-top: 1px solid #eee;
}

.barcode-edit-button {
border: 1px solid #ccc;
background: #fff;
border-radius: 5px;
padding: 8px 12px;
cursor: pointer;
font-size: 11px;
font-weight: 600;
}

.barcode-edit-button.primary {
background: #111;
color: #fff;
border-color: #111;
}

/* CSV IMPORT POPUP */

.barcode-csv-modal {
position: fixed;
inset: 0;
z-index: 99999;
display: flex;
align-items: center;
justify-content: center;
padding: 24px;
box-sizing: border-box;
background: rgba(0,0,0,.45);
}

.barcode-csv-modal-box {
width: min(900px, 100%);
max-height: min(760px, 90vh);
background: #fff;
border-radius: 10px;
box-shadow: 0 20px 60px rgba(0,0,0,.25);
display: flex;
flex-direction: column;
overflow: hidden;
font-family: inherit;
}

.barcode-csv-modal-header {
display: flex;
align-items: center;
justify-content: space-between;
padding: 18px 22px;
border-bottom: 1px solid #eee;
flex: 0 0 auto;
}

.barcode-csv-modal-title {
font-size: 18px;
font-weight: 700;
margin: 0;
}

.barcode-csv-modal-close {
width: 32px;
height: 32px;
border: 0;
background: transparent;
font-size: 24px;
line-height: 1;
cursor: pointer;
border-radius: 5px;
}

.barcode-csv-modal-close:hover {
background: #f2f2f2;
}

.barcode-csv-modal-options {
display: flex;
align-items: center;
gap: 18px;
padding: 14px 22px;
border-bottom: 1px solid #eee;
background: #fafafa;
flex: 0 0 auto;
}

.barcode-csv-checkbox-label {
display: flex;
align-items: center;
gap: 8px;
font-size: 13px;
font-weight: 600;
cursor: pointer;
}

.barcode-csv-checkbox {
width: 16px;
height: 16px;
margin: 0;
cursor: pointer;
}

.barcode-csv-summary {
margin-left: auto;
font-size: 12px;
color: #666;
}

.barcode-csv-table-wrap {
overflow: auto;
flex: 1 1 auto;
min-height: 0;
}

.barcode-csv-table {
width: 100%;
border-collapse: collapse;
font-size: 12px;
}

.barcode-csv-table th {
position: sticky;
top: 0;
z-index: 2;
background: #f5f5f5;
border-bottom: 1px solid #ddd;
padding: 10px 12px;
text-align: left;
font-weight: 700;
white-space: nowrap;
}

.barcode-csv-table td {
padding: 8px 12px;
border-bottom: 1px solid #eee;
vertical-align: middle;
}

.barcode-csv-table tr:hover td {
background: #fafafa;
}

.barcode-csv-part {
font-weight: 700;
white-space: nowrap;
}

.barcode-csv-description {
color: #555;
max-width: 480px;
}

.barcode-csv-qty {
width: 70px;
padding: 7px 8px;
border: 1px solid #ccc;
border-radius: 5px;
font-size: 12px;
box-sizing: border-box;
text-align: center;
}

.barcode-csv-qty:focus {
outline: none;
border-color: #111;
}

.barcode-csv-modal-footer {
display: flex;
align-items: center;
justify-content: flex-end;
gap: 8px;
padding: 14px 22px;
border-top: 1px solid #eee;
flex: 0 0 auto;
}

.barcode-csv-button {
border: 1px solid #ccc;
background: #fff;
border-radius: 5px;
padding: 9px 14px;
cursor: pointer;
font-size: 12px;
font-weight: 600;
}

.barcode-csv-button:hover {
background: #f5f5f5;
}

.barcode-csv-button.primary {
background: #111;
color: #fff;
border-color: #111;
}

.barcode-csv-button.primary:hover {
background: #333;
}

#barcode-print-root {
display: none;
}

@media (max-width: 700px) {

.barcode-csv-modal {
padding: 10px;
}

.barcode-csv-modal-box {
max-height: 94vh;
}

.barcode-csv-modal-options {
flex-wrap: wrap;
gap: 10px;
}

.barcode-csv-summary {
width: 100%;
margin-left: 0;
}

.barcode-csv-description {
max-width: 250px;
}

}

@media print {

html,
body {
margin: 0 !important;
padding: 0 !important;
width: 100% !important;
height: auto !important;
}

body > *:not(#barcode-print-root) {
display: none !important;
}

#barcode-print-root {
display: block !important;
position: static !important;
width: 100% !important;
height: auto !important;
margin: 0 !important;
padding: 0 !important;
overflow: visible !important;
}

#barcode-print-root .barcode-page {
display: block !important;
position: relative !important;
width: 210mm !important;
height: 297mm !important;
margin: 0 !important;
padding: 0 !important;
overflow: hidden !important;
break-after: page;
page-break-after: always;
box-sizing: border-box !important;
}

#barcode-print-root .barcode-page:last-child {
break-after: auto;
page-break-after: auto;
}

#barcode-print-root .barcode-page * {
visibility: visible !important;
}

#barcode-print-root .barcode-card-overlay,
#barcode-print-root .barcode-edit-panel {
display: none !important;
}

}

`;

document.head.appendChild(
style
);

}

function cardData(data = {}) {

counter++;

const template =
data.template ||
state.current ||
DEFAULTS.template;

const defaults =
getTemplateDefaults(
template
);

return {

id:
data.id ||
'barcode-' + counter,

template,

partNumber:
data.partNumber ??
DEFAULTS.partNumber,

subtext:
data.subtext ??
DEFAULTS.subtext,

partNumberSize:
Number(
data.partNumberSize
) ||
defaults.partNumberSize,

subtextSize:
Number(
data.subtextSize
) ||
defaults.subtextSize,

barcodeSize:
Number(
data.barcodeSize
) ||
defaults.barcodeSize

};

}

function get(id) {

return state.cards.find(
card =>
card.id === id
);

}

function add(data = {}) {

const card =
cardData(data);

state.cards.push(
card
);

state.current =
card.template;

render();

return card;

}

function remove(id) {

const deleted =
get(id);

if (!deleted) {
return;
}

const templateCards =
state.cards.filter(
card =>
card.template ===
deleted.template
);

const deletedIndex =
templateCards.findIndex(
card =>
card.id === id
);

const previousCard =
templateCards[
deletedIndex - 1
];

const nextCard =
templateCards[
deletedIndex + 1
];

const replacement =
previousCard ||
nextCard ||
null;

state.cards =
state.cards.filter(
card =>
card.id !== id
);

if (
editing === id &&
replacement
) {

state.current =
replacement.template;

render();

const remaining =
get(
replacement.id
);

if (remaining) {
openEdit(
remaining
);
}

return;

}

if (editing === id) {
hideEdit();
}

render();

}

function cleanPartNumber(value) {

return String(value || '')
.trim()
.replace(/^#/, '')
.trim();

}

function barcodeValue(value) {

const clean =
cleanPartNumber(value);

if (!clean) {
return '';
}

return `*${clean}*`;

}

function simplifyDescription(
value,
template
) {

let text =
String(value ?? '')
.replace(
/[\r\n\t]+/g,
' '
)
.replace(
/\s+/g,
' '
)
.replace(
/\s+([,.;:])/g,
'$1'
)
.trim();

if (
template === 'xlarge' &&
text.length > 83
) {

text =
text
.slice(0, 83)
.trimEnd() +
'...';

}

return text;

}

function populateCard(
card,
data
) {

const header =
card.querySelector(
'.text-input-header > *'
) ||
card.querySelector(
'.text-input-header'
);

const subtext =
card.querySelector(
'.text-input-subtext > *'
) ||
card.querySelector(
'.text-input-subtext'
);

let barcode =
card.querySelector(
'.barcode-populate'
);

if (!barcode) {

barcode =
document.createElement(
'div'
);

barcode.className =
'barcode-populate barcode-populate-auto';

card.appendChild(
barcode
);

}

if (header) {

header.textContent =
data.partNumber || '';

header.style.fontSize =
data.partNumberSize +
'px';

header.style.lineHeight =
data.partNumberSize +
'px';

}

if (subtext) {

subtext.textContent =
data.subtext || '';

subtext.style.fontSize =
data.subtextSize +
'px';

subtext.style.lineHeight =
data.subtextSize +
'px';

}

if (barcode) {

const barcodeSize =
Number(
data.barcodeSize
) ||
getTemplateDefaults(
data.template
).barcodeSize;

barcode.textContent =
barcodeValue(
data.partNumber
);

barcode.dataset.barcodeSize =
barcodeSize;

barcode.style.fontSize =
barcodeSize +
'px';

barcode.style.lineHeight =
'normal';

barcode.style.height =
'';

barcode.style.overflow =
'';

barcode.style.boxSizing =
'';

}

}

function createCard(data) {

const src =
getSource(
data.template
);

if (!src) {

console.warn(
'[barcode] template not found for:',
data.template
);

return null;

}

const card =
src.label.cloneNode(
true
);

card.classList.add(
'barcode-card'
);

card.dataset.cardId =
data.id;

card.dataset.barcodeTemplate =
data.template;

populateCard(
card,
data
);

const overlay =
document.createElement(
'div'
);

overlay.className =
'barcode-card-overlay';

overlay.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

openEdit(
data
);

}
);

card.appendChild(
overlay
);

return card;

}

function chunk(
cards,
size
) {

const pages = [];

for (
let i = 0;
i < cards.length;
i += size
) {

pages.push(
cards.slice(
i,
i + size
)
);

}

return pages;

}

function renderTemplate(id) {

const config =
TEMPLATES[id];

const panel =
document.querySelector(
config.panel
);

if (!panel) {
return;
}

const wrapper =
panel.querySelector(
'.barcode-page-wrapper'
) ||
panel;

if (
id !== state.current
) {

wrapper
.querySelectorAll(
'.barcode-page[data-generated]'
)
.forEach(
p => p.remove()
);

panel.style.removeProperty(
'display'
);

return;

}

const src =
getSource(id);

if (!src) {

console.warn(
'[barcode] cannot render template:',
config.panel
);

return;

}

const cards =
state.cards.filter(
c =>
c.template === id
);

wrapper.innerHTML = '';

const groups =
cards.length
? chunk(
cards,
config.capacity
)
: [[]];

groups.forEach(
group => {

const page =
src.page.cloneNode(
true
);

page.dataset.generated =
'true';

const grid =
page.querySelector(
config.grid
) ||
page.querySelector(
'[class*="-grid"]'
);

if (!grid) {

console.warn(
'[barcode] grid not found:',
config.grid
);

return;

}

grid.innerHTML = '';

group.forEach(
data => {

const card =
createCard(
data
);

if (card) {
grid.appendChild(
card
);
}

}
);

wrapper.appendChild(
page
);

unhide(
wrapper,
'block'
);

unhide(
page,
'block'
);

unhide(
grid,
'grid'
);

grid
.querySelectorAll(
'.barcode-card'
)
.forEach(
c =>
unhide(
c,
'block'
)
);

}
);

panel.style.setProperty(
'display',
'block',
'important'
);

}

function render() {

if (
!els.panel ||
!els.panel.isConnected
) {

cache();

}

if (!els.panel) {
return;
}

Object.keys(
TEMPLATES
).forEach(
renderTemplate
);

if (!state.current) {
closeBarcodePanel();
}

}

function live(data) {

if (!els.panel) {
return;
}

els.panel
.querySelectorAll(
`[data-card-id="${data.id}"]`
)
.forEach(
card => {

populateCard(
card,
data
);

}
);

}

function textField(
label,
value,
callback
) {

const wrap =
document.createElement(
'div'
);

wrap.className =
'barcode-field-group';

const l =
document.createElement(
'label'
);

l.className =
'barcode-field-label';

l.textContent =
label;

const input =
document.createElement(
'input'
);

input.className =
'barcode-field-input';

input.type =
'text';

input.value =
value ?? '';

input.addEventListener(
'input',
() =>
callback(
input.value
)
);

wrap.append(
l,
input
);

return wrap;

}

function numberField(
label,
value,
callback
) {

const wrap =
document.createElement(
'div'
);

wrap.className =
'barcode-control-row';

const l =
document.createElement(
'label'
);

l.className =
'barcode-control-label';

l.textContent =
label;

const input =
document.createElement(
'input'
);

input.className =
'barcode-control barcode-number';

input.type =
'number';

input.min =
'1';

input.value =
value ?? '';

input.addEventListener(
'input',
() =>
callback(
input.value
)
);

wrap.append(
l,
input
);

return wrap;

}

function section(
title,
children
) {

const s =
document.createElement(
'div'
);

s.className =
'barcode-edit-section';

const h =
document.createElement(
'div'
);

h.className =
'barcode-edit-section-title';

h.textContent =
title;

s.appendChild(
h
);

children.forEach(
x =>
s.appendChild(x)
);

return s;

}

function button(
label,
className,
onClick
) {

const b =
document.createElement(
'button'
);

b.type =
'button';

b.className =
className;

b.textContent =
label;

b.onclick =
onClick;

return b;

}

function buildEditPanel(
card
) {

const panel =
document.createElement(
'div'
);

panel.className =
'barcode-edit-panel';

panel.dataset.cardId =
card.id;

const header =
document.createElement(
'div'
);

header.className =
'barcode-edit-panel-header';

const title =
document.createElement(
'div'
);

title.className =
'barcode-edit-panel-title';

title.textContent =
'Edit Barcode';

header.append(
title,
button(
'×',
'barcode-edit-panel-close',
hideEdit
)
);

panel.appendChild(
header
);

panel.appendChild(
section(
'Content',
[

textField(
'Part Number',
card.partNumber,
value => {

card.partNumber =
value;

live(card);

}
),

textField(
'Description',
card.subtext,
value => {

card.subtext =
value;

live(card);

}
)

]
)
);

panel.appendChild(
section(
'Size',
[

numberField(
'Part Number Font Size',
card.partNumberSize,
value => {

const defaults =
getTemplateDefaults(
card.template
);

card.partNumberSize =
Number(value) ||
defaults.partNumberSize;

live(card);

}
),

numberField(
'Description Font Size',
card.subtextSize,
value => {

const defaults =
getTemplateDefaults(
card.template
);

card.subtextSize =
Number(value) ||
defaults.subtextSize;

live(card);

}
),

numberField(
'Barcode Size',
card.barcodeSize,
value => {

const defaults =
getTemplateDefaults(
card.template
);

card.barcodeSize =
Number(value) ||
defaults.barcodeSize;

live(card);

}
)

]
)
);

const footer =
document.createElement(
'div'
);

footer.className =
'barcode-edit-panel-footer';

footer.append(

button(
'Reset',
'barcode-edit-button',
() => {

card.partNumber =
DEFAULTS.partNumber;

card.subtext =
DEFAULTS.subtext;

const defaults =
getTemplateDefaults(
card.template
);

card.partNumberSize =
defaults.partNumberSize;

card.subtextSize =
defaults.subtextSize;

card.barcodeSize =
defaults.barcodeSize;

render();

openEdit(
card
);

}
),

button(
'Copy',
'barcode-edit-button',
() => {

const duplicate =
add({
template:
card.template,

partNumber:
card.partNumber,

subtext:
card.subtext,

partNumberSize:
card.partNumberSize,

subtextSize:
card.subtextSize,

barcodeSize:
card.barcodeSize
});

openEdit(
duplicate
);

}
),

button(
'Delete',
'barcode-edit-button',
() =>
remove(
card.id
)
),

button(
'Save',
'barcode-edit-button primary',
() => {

render();

hideEdit();

}
)

);

panel.appendChild(
footer
);

return panel;

}

function openEdit(card) {

if (!card) {
return;
}

const host =
els.left ||
els.panel;

if (!host) {
return;
}

openBarcodePanel();

const old =
host.querySelector(
'.barcode-edit-panel'
);

if (old) {
old.remove();
}

editing =
card.id;

if (els.left) {

if (els.menu) {

els.menu.style.display =
'none';

}

els.left.classList.add(
'editing'
);

}

const panel =
buildEditPanel(
card
);

host.appendChild(
panel
);

requestAnimationFrame(
() => {

panel.scrollTop =
0;

}
);

}

function hideEdit() {

editing = null;

[
els.left,
els.panel
].forEach(
host => {

if (!host) return;

const panel =
host.querySelector(
'.barcode-edit-panel'
);

if (panel) {
panel.remove();
}

}
);

if (els.left) {

els.left.classList.remove(
'editing'
);

}

if (els.menu) {

els.menu.style.display =
'';

}

}

function selectTemplate(id) {

if (!TEMPLATES[id]) {
return;
}

state.current =
id;

if (editing) {

const c =
get(editing);

if (
!c ||
c.template !== id
) {

hideEdit();

}

}

render();

openBarcodePanel();

}

function createDropdown(
wrapper
) {

if (!wrapper) {
return;
}

if (
wrapper.dataset.loaded ===
'true'
) {

return;
}

Object.entries(
TEMPLATES
).forEach(
([id, template]) => {

const item =
document.createElement(
'div'
);

item.className =
'db-list-dropdown-card';

item.dataset.barcodeTemplate =
id;

const heading =
document.createElement(
'div'
);

heading.className =
'db-headingd-list';

heading.textContent =
template.name;

item.appendChild(
heading
);

wrapper.appendChild(
item
);

}
);

wrapper.addEventListener(
'click',
function (e) {

const item =
e.target.closest(
'.db-list-dropdown-card[data-barcode-template]'
);

if (!item) {
return;
}

e.preventDefault();
e.stopPropagation();

const selectedTemplate =
item.dataset.barcodeTemplate;

console.log(
'[barcode] template picked:',
selectedTemplate
);

selectTemplate(
selectedTemplate
);

closeDropdown();

},
true
);

wrapper.dataset.loaded =
'true';

}

function closeDropdown() {

if (!els.dropdown) {
return;
}

els.dropdown.classList.remove(
DROPDOWN_OPEN_CLASS
);

}

function toggleDropdown() {

if (!els.dropdown) {
return;
}

els.dropdown.classList.toggle(
DROPDOWN_OPEN_CLASS
);

}

function preparePrint() {

const old =
document.getElementById(
'barcode-print-root'
);

if (old) {
old.remove();
}

const config =
TEMPLATES[
state.current
];

if (!config) {

console.warn(
'[barcode] No template selected to print.'
);

return null;

}

const panel =
document.querySelector(
config.panel
);

if (!panel) {

console.warn(
'[barcode] Selected template panel not found:',
state.current
);

return null;

}

const pages =
panel.querySelectorAll(
'.barcode-page'
);

if (!pages.length) {

console.warn(
'[barcode] No .barcode-page elements found in selected template:',
state.current
);

return null;

}

const printRoot =
document.createElement(
'div'
);

printRoot.id =
'barcode-print-root';

pages.forEach(
page => {

const clone =
page.cloneNode(
true
);

clone
.querySelectorAll(
'.barcode-card-overlay, .barcode-edit-panel'
)
.forEach(
el => el.remove()
);

printRoot.appendChild(
clone
);

}
);

document.body.appendChild(
printRoot
);

return printRoot;

}

function parseCSV(text) {

const rows = [];

let row = [];
let cell = '';
let quoted = false;

for (
let i = 0;
i < text.length;
i++
) {

const char =
text[i];

const next =
text[i + 1];

if (
char === '"' &&
quoted &&
next === '"'
) {

cell += '"';

i++;

continue;

}

if (char === '"') {

quoted =
!quoted;

continue;

}

if (
char === ',' &&
!quoted
) {

row.push(
cell
);

cell = '';

continue;

}

if (
(
char === '\n' ||
char === '\r'
) &&
!quoted
) {

if (
char === '\r' &&
next === '\n'
) {

i++;

}

row.push(
cell
);

cell = '';

if (
row.some(
value =>
String(
value
).trim() !== ''
)
) {

rows.push(
row
);

}

row = [];

continue;

}

cell += char;

}

row.push(
cell
);

if (
row.some(
value =>
String(
value
).trim() !== ''
)
) {

rows.push(
row
);

}

if (!rows.length) {
return [];
}

const headers =
rows
.shift()
.map(
header =>
String(header)
.replace(
/^\uFEFF/,
''
)
.trim()
);

return rows.map(
row => {

const item = {};

headers.forEach(
(
header,
index
) => {

item[header] =
String(
row[index] ?? ''
).trim();

}
);

return item;

}
);

}

/* ----------------------------------------
   CSV IMPORT POPUP
---------------------------------------- */

let csvModal = null;

function closeCSVModal() {

if (!csvModal) {
return;
}

csvModal.remove();
csvModal = null;

}

function updateCSVModalSummary(
rows,
qtyInputs
) {

if (!csvModal) {
return;
}

const total =
qtyInputs.reduce(
(sum, input) =>
sum +
Math.max(
1,
parseInt(
input.value,
10
) || 1
),
0
);

const summary =
csvModal.querySelector(
'.barcode-csv-summary'
);

if (summary) {

summary.textContent =
total +
' label' +
(
total === 1
? ''
: 's'
) +
' will be created';

}

}

function openCSVModal(rows) {

closeCSVModal();

const modal =
document.createElement(
'div'
);

modal.className =
'barcode-csv-modal';

modal.setAttribute(
'role',
'dialog'
);

modal.setAttribute(
'aria-modal',
'true'
);

const box =
document.createElement(
'div'
);

box.className =
'barcode-csv-modal-box';

const header =
document.createElement(
'div'
);

header.className =
'barcode-csv-modal-header';

const title =
document.createElement(
'h2'
);

title.className =
'barcode-csv-modal-title';

title.textContent =
'Import CSV';

const closeButton =
document.createElement(
'button'
);

closeButton.type =
'button';

closeButton.className =
'barcode-csv-modal-close';

closeButton.textContent =
'×';

closeButton.setAttribute(
'aria-label',
'Close'
);

closeButton.addEventListener(
'click',
closeCSVModal
);

header.append(
title,
closeButton
);

const options =
document.createElement(
'div'
);

options.className =
'barcode-csv-modal-options';

const label =
document.createElement(
'label'
);

label.className =
'barcode-csv-checkbox-label';

const checkbox =
document.createElement(
'input'
);

checkbox.type =
'checkbox';

checkbox.className =
'barcode-csv-checkbox';

checkbox.checked =
true;

const labelText =
document.createElement(
'span'
);

labelText.textContent =
'Part Number + Description';

label.append(
checkbox,
labelText
);

const summary =
document.createElement(
'div'
);

summary.className =
'barcode-csv-summary';

options.append(
label,
summary
);

const tableWrap =
document.createElement(
'div'
);

tableWrap.className =
'barcode-csv-table-wrap';

const table =
document.createElement(
'table'
);

table.className =
'barcode-csv-table';

const thead =
document.createElement(
'thead'
);

const headerRow =
document.createElement(
'tr'
);

[
'Part Number',
'Description',
'Qty'
].forEach(
text => {

const th =
document.createElement(
'th'
);

th.textContent =
text;

headerRow.appendChild(
th
);

}
);

thead.appendChild(
headerRow
);

const tbody =
document.createElement(
'tbody'
);

const qtyInputs = [];

rows.forEach(
row => {

const tr =
document.createElement(
'tr'
);

const partCell =
document.createElement(
'td'
);

partCell.className =
'barcode-csv-part';

partCell.textContent =
row.partNumber;

const descriptionCell =
document.createElement(
'td'
);

descriptionCell.className =
'barcode-csv-description';

descriptionCell.textContent =
row.description || '';

const qtyCell =
document.createElement(
'td'
);

const qty =
document.createElement(
'input'
);

qty.type =
'number';

qty.className =
'barcode-csv-qty';

qty.min =
'1';

qty.step =
'1';

qty.value =
'1';

qtyInputs.push(
qty
);

qty.addEventListener(
'input',
function () {

let value =
parseInt(
qty.value,
10
);

if (
!Number.isFinite(value) ||
value < 1
) {

value = 1;

}

qty.value =
value;

updateCSVModalSummary(
rows,
qtyInputs
);

}
);

qtyCell.appendChild(
qty
);

tr.append(
partCell,
descriptionCell,
qtyCell
);

tbody.appendChild(
tr
);

}
);

table.append(
thead,
tbody
);

tableWrap.appendChild(
table
);

const footer =
document.createElement(
'div'
);

footer.className =
'barcode-csv-modal-footer';

const cancel =
document.createElement(
'button'
);

cancel.type =
'button';

cancel.className =
'barcode-csv-button';

cancel.textContent =
'Cancel';

cancel.addEventListener(
'click',
closeCSVModal
);

const importButton =
document.createElement(
'button'
);

importButton.type =
'button';

importButton.className =
'barcode-csv-button primary';

importButton.textContent =
'Import Labels';

importButton.addEventListener(
'click',
function () {

const template =
state.current ||
DEFAULTS.template;

const useDescription =
checkbox.checked;

let imported =
0;

rows.forEach(
(row, index) => {

let qtyValue =
parseInt(
qtyInputs[index].value,
10
);

if (
!Number.isFinite(qtyValue) ||
qtyValue < 1
) {

qtyValue = 1;

}

const description =
useDescription
? simplifyDescription(
row.description,
template
)
: '';

for (
let i = 0;
i < qtyValue;
i++
) {

add({
template,
partNumber:
row.partNumber,
subtext:
description
});

imported++;

}

}
);

render();

closeCSVModal();

alert(
imported +
' label' +
(
imported === 1
? ''
: 's'
) +
' imported.'
);

}
);

footer.append(
cancel,
importButton
);

box.append(
header,
options,
tableWrap,
footer
);

modal.appendChild(
box
);

modal.addEventListener(
'click',
function (e) {

if (e.target === modal) {
closeCSVModal();
}

}
);

document.body.appendChild(
modal
);

csvModal =
modal;

updateCSVModalSummary(
rows,
qtyInputs
);

if (qtyInputs.length) {

setTimeout(
() => qtyInputs[0].focus(),
50
);

}

}

/* ----------------------------------------
   CSV IMPORT
---------------------------------------- */

function importCSV() {

const input =
document.createElement(
'input'
);

input.type =
'file';

input.accept =
'.csv,text/csv';

input.style.position =
'fixed';

input.style.left =
'-9999px';

input.style.top =
'0';

input.style.width =
'1px';

input.style.height =
'1px';

input.style.opacity =
'0';

input.setAttribute(
'aria-hidden',
'true'
);

document.body.appendChild(
input
);

input.addEventListener(
'change',
function () {

const file =
input.files &&
input.files[0];

if (!file) {

input.remove();

return;

}

const reader =
new FileReader();

reader.onload =
function () {

try {

const rows =
parseCSV(
String(
reader.result ||
''
)
);

if (!rows.length) {

alert(
'The CSV appears to be empty.'
);

input.remove();

return;

}

const first =
rows[0];

const stockCodeKey =
Object.keys(first).find(
key =>
String(key)
.trim()
.toLowerCase() ===
'stock code'
);

if (!stockCodeKey) {

alert(
'The CSV must contain a "Stock Code" column.'
);

input.remove();

return;

}

const descriptionKey =
Object.keys(first).find(
key =>
String(key)
.trim()
.toLowerCase() ===
'description'
);

const preparedRows =
rows
.map(
row => {

const partNumber =
cleanPartNumber(
row[stockCodeKey]
);

if (!partNumber) {
return null;
}

return {
partNumber,
description:
descriptionKey
? String(
row[descriptionKey] ??
''
).trim()
: ''
};

}
)
.filter(Boolean);

if (!preparedRows.length) {

alert(
'No rows with a Stock Code were found.'
);

input.remove();

return;

}

openCSVModal(
preparedRows
);

} catch (error) {

console.error(
'[barcode] CSV import failed:',
error
);

alert(
'There was a problem reading the CSV.'
);

}

input.remove();

};

reader.onerror =
function () {

alert(
'The CSV could not be read.'
);

input.remove();

};

reader.readAsText(
file
);

},
{
once: true
}
);

input.click();

}

function setupCSVImport() {

const button =
$('.barcode-import-card-button');

if (!button) {

console.warn(
'[barcode] CSV import button not found:',
'.barcode-import-card-button'
);

return;

}

if (
button.dataset.csvReady ===
'true'
) {

return;

}

button.dataset.csvReady =
'true';

button.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

console.log(
'[barcode] opening CSV file picker'
);

importCSV();

}
);

console.log(
'[barcode] CSV import button connected:',
'.barcode-import-card-button'
);

}

function init() {

cache();

if (
!els.panel ||
!els.pages
) {

setTimeout(
init,
100
);

return;

}

if (!ready) {

ready = true;

cacheSources();

injectStyles();

loadBarcodeFont();

if (els.add) {

els.add.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

const card =
add({
template:
state.current ||
DEFAULTS.template
});

openEdit(
card
);

}
);

}

setupCSVImport();

if (els.print) {

els.print.addEventListener(
'click',
function (e) {

e.preventDefault();
e.stopPropagation();

const printRoot =
preparePrint();

if (!printRoot) {

console.warn(
'[barcode] nothing available to print'
);

return;

}

requestAnimationFrame(
() => {

requestAnimationFrame(
() => {

window.print();

}
);

}
);

}
);

}

const drop =
$('#barcode-drop');

if (drop) {

drop.style.cursor =
'pointer';

drop.addEventListener(
'click',
function (e) {

if (
e.target.closest(
'.db-list-dropdown-card[data-barcode-template]'
)
) {

return;

}

e.preventDefault();
e.stopPropagation();

toggleDropdown();

}
);

}

window.addEventListener(
'afterprint',
function () {

const printRoot =
document.getElementById(
'barcode-print-root'
);

if (printRoot) {
printRoot.remove();
}

}
);

}

createDropdown(
els.dropdown
);

render();

}

document.addEventListener(
'db-tool-open',
function (e) {

if (
e.detail?.id !== 'barcodes'
) {

return;

}

init();

}
);

if (
document.readyState ===
'loading'
) {

document.addEventListener(
'DOMContentLoaded',
init,
{ once: true }
);

} else {

init();

}

window.MTWBarcodeTool = {

state,

addCard:
add,

getCard:
get,

deleteCard:
remove,

render,

openEdit,

hideEdit,

selectTemplate,

importCSV,

diagnose

};

})();

