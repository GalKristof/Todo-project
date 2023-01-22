import { Component, OnInit, HostListener } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';
import { CalendarOptions, EventAddArg, EventDropArg, EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ToDo } from '../models/todo.model';
import { TodoService } from './todo.service';


type ToDosByStatus = {
  [status in 'Nincs elkezdve' | 'Folyamatban' | 'Kész' | 'Archivált']: ToDo[]
}

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.css']
})


export class TodoComponent implements OnInit{
  
  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    plugins: [dayGridPlugin, interactionPlugin],
    eventStartEditable: true,
    eventDurationEditable: true,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,dayGridDay'
    },
    height: "650px",
    eventDrop: (info) => {
      this.handleEventDrop(info);
    },
    eventMouseEnter: (info) =>{
      this.onCalendarEventMouseEnter(info);
    },
    eventMouseLeave: (info) =>{
      this.onCalendarEventMouseLeave(info);
    }
  }
  
  wantNewToDo = false;
  wantMultipleModify = false;
  whatToMultiplyModify: string[] = [];
  
  minDate = new Date(); // mai napi dátum. Nem lehet múltba létrehozni ToDot.
  maxDate = new Date(2040, 0, 1); // max dátum 2040 jan 1.
  
  todoForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl('Nincs elkezdve'),
    priority: new FormControl('Alacsony'),
    deadline: new FormControl(new Date())
  });
  
  currentTodoForm: FormGroup = new FormGroup({
    currentTitle: new FormControl('', Validators.required),
    currentDescription: new FormControl('', Validators.required),
    currentStatus: new FormControl(''),
    currentPriority: new FormControl(''),
    currentDeadline: new FormControl('')
  }, {updateOn: 'blur'})

  modalTodoForm: FormGroup = new FormGroup({
    modalTitle: new FormControl('', Validators.required),
    modalDescription: new FormControl('', Validators.required),
    modalStatus: new FormControl('')
  }, {updateOn: 'blur'})
  
  groupedToDos: {[key: string]: ToDo[]} = {};
  lengthOfToDos = 0;
  currentOpenedToDo = 0;
  groupOfSelectedToDos: ToDo[] = [];

  
  showFilter = false;
  filterRules = {
    filterAttribbutes: {
      createdAtBeginning : new Date(2023, 0, 1),
      createdAtEnding : new Date(2024, 0, 1),
      modifiedAtBeginning : new Date(2023, 0, 1),
      modifiedAtEnding : new Date(2024, 0, 1),
      deadlineBeginning : new Date(2023, 0, 1),
      deadlineEnding: new Date(2024, 0, 1),
      priorityLow: true,
      priorityMid: true,
      priorityHigh: true
    },
    searchAttribbutes: {
      nameContains: "",
      descriptionContains: ""
    }
  }

  currentlyHoveredToDo: ToDo | undefined;
  currentlyClickedToDo: ToDo | undefined;

  
  constructor(
    private todoService: TodoService
    ){};
    
    ngOnInit(): void {
      this.todoService.getAllTodos().subscribe(todos => {
      this.groupedToDos = this.groupTodosByStatus(todos);
      let calendarEvents = [];
      for(let i = 0; i < todos.length; i++)
      {
        let todo = todos[i]
        let event = {
          id: todo.id.toString(),
          title: todo.title,
          date: todo.deadline,
          editable: true,
          droppable: true,
          draggable: true
        }
        calendarEvents.push(event);
      }
      this.calendarOptions.events = calendarEvents;
    });

    this.currentTodoForm.valueChanges.subscribe(selectedValue => {
      if(!this.currentTodoForm.dirty) return;
      const currentTodo = this.findToDoById(this.currentOpenedToDo);
      if(currentTodo === undefined) return;
      return this.modifyToDo(currentTodo);
    })
    
    this.modalTodoForm.valueChanges.subscribe(selectedValue => {
      if(!this.modalTodoForm.dirty) return;
      const currentTodo = this.currentlyClickedToDo;
      if(currentTodo === undefined) return;
      return this.modifyModalToDo(currentTodo);
    })

  }

  groupTodosByStatus(todos: ToDo[]): ToDosByStatus {
    this.lengthOfToDos = todos.length;
    return todos.reduce((acc, curr) => {
    curr.expanded = false;
    if (!acc[curr.status]) acc[curr.status] = [];
    acc[curr.status]?.push(curr);
    return acc;
    }, {} as ToDosByStatus);
  }

  onAdd(){
    const nextID = (Math.max(...Object.values(this.groupedToDos).flat().map(x => x.id))) + 1;
    const newTodo: ToDo = {
      "id": nextID,
      "title": this.todoForm.controls['title'].value,
      "description": this.todoForm.controls['description'].value,
      "status": this.todoForm.controls['status'].value,
      "priority": this.todoForm.controls['priority'].value,
      "createdAt": new Date(),
      "modifiedAt": new Date(),
      "deadline": this.todoForm.controls['deadline'].value,
      "expanded": false
    }
    this.todoService.createTodo(newTodo).subscribe(response => {
      location.reload();
    });
  };

  onMultipleModify(){
    const numberOfSelectedToDos = this.groupOfSelectedToDos.length;
    let i = 0;
    for(let todo of this.groupOfSelectedToDos)
    {
      i++;
      if(this.whatToMultiplyModify.includes('title')) todo.title = this.todoForm.controls['title'].value;
      if(this.whatToMultiplyModify.includes('description')) todo.description = this.todoForm.controls['description'].value;
      if(this.whatToMultiplyModify.includes('status')) todo.status = this.todoForm.controls['status'].value;
      if(this.whatToMultiplyModify.includes('priority')) todo.priority = this.todoForm.controls['priority'].value;
      if(this.whatToMultiplyModify.includes('deadline')) todo.deadline = this.todoForm.controls['deadline'].value;
      todo.modifiedAt = new Date();
      todo.expanded = false;
      this.todoService.updateTodo(todo).subscribe(response => {
         if(i === numberOfSelectedToDos) location.reload();
      })
    }
  }

  onMultipleDelete()
  {
     const numberOfSelectedToDos = this.groupOfSelectedToDos.length;
     let i = 0;
     for(let todo of this.groupOfSelectedToDos)
     {
       i++;
       this.todoService.deleteTodo(todo.id).subscribe(response => {
         if(i === numberOfSelectedToDos) location.reload();
       })
     }
  }

  onDelete(id: number | undefined)
  {
    if(!id) return;
    this.todoService.deleteTodo(id).subscribe(response => {
      location.reload();
    })
  }

  modifyToDo(todo: ToDo)
  {
    let isStatusChanged = false;
    if(todo.status !== this.currentTodoForm.controls['currentStatus'].value) isStatusChanged = true;
    todo.title = this.currentTodoForm.controls['currentTitle'].value;
    todo.description = this.currentTodoForm.controls['currentDescription'].value;
    todo.status = this.currentTodoForm.controls['currentStatus'].value;
    todo.priority = this.currentTodoForm.controls['currentPriority'].value;
    todo.deadline = this.currentTodoForm.controls['currentDeadline'].value;
    todo.modifiedAt = new Date();
    if(isStatusChanged)
    {
      todo.expanded = false;
      this.currentOpenedToDo = 0;
    }
    this.todoService.updateTodo(todo).subscribe(response => {
      if(isStatusChanged) location.reload();
    });
  }

  modifyModalToDo(todo: ToDo)
  {
    let isStatusChanged = false;
    if(todo.status !== this.modalTodoForm.controls['modalStatus'].value) isStatusChanged = true;
    todo.title = this.modalTodoForm.controls['modalTitle'].value;
    todo.description = this.modalTodoForm.controls['modalDescription'].value;
    todo.status = this.modalTodoForm.controls['modalStatus'].value;
    todo.modifiedAt = new Date();
    if(isStatusChanged)
    {
      todo.expanded = false;
      this.currentOpenedToDo = 0;
    }
    this.todoService.updateTodo(todo).subscribe(response => {
      if(isStatusChanged) location.reload();
    });
  }
 

  changeCurrentOpenedToDo(id: number)
  {
    if(this.currentOpenedToDo === id) return this.currentOpenedToDo = 0;
    return this.currentOpenedToDo = id; 
  }
  
  closeOtherOpenedToDo(todo: ToDo)
  {
    if(this.currentOpenedToDo === todo.id || this.currentOpenedToDo === 0) return;
    const openedToDo = this.findToDoById(this.currentOpenedToDo);
    if(openedToDo === undefined) return;
    openedToDo.expanded = false;
    this.currentTodoForm.reset();
  }

  changeSelectedStatus(todo: ToDo)
  {
    const selectedToDoIndex = this.groupOfSelectedToDos.findIndex(x => x.id === todo.id);
    if(selectedToDoIndex === -1) return this.groupOfSelectedToDos.push(todo);
    return this.groupOfSelectedToDos.splice(selectedToDoIndex, 1);
  }

  controlMultipleModificationElements(element: string)
  {
    let indexOfElement = this.whatToMultiplyModify.indexOf(element)
    if(indexOfElement === -1){
      if(element === 'title') this.todoForm.controls['title'].setValidators(Validators.required);
      if(element === 'description') this.todoForm.controls['description'].setValidators(Validators.required);
      this.todoForm.updateValueAndValidity();
      return this.whatToMultiplyModify.push(element);
    }
    if(element === 'title') this.todoForm.controls['title'].clearValidators();
    if(element === 'description') this.todoForm.controls['description'].clearValidators();
    this.todoForm.updateValueAndValidity(); 
    return this.whatToMultiplyModify.splice(indexOfElement, 1);
  }

  setFormValidators(currentOption: string)
  {
    if(currentOption === "new"){
      this.todoForm.controls['title'].setValidators(Validators.required);
      this.todoForm.controls['description'].setValidators(Validators.required);
      this.todoForm.updateValueAndValidity();
    }
    
    if(currentOption === "modify"){
      this.todoForm.controls['title'].clearValidators();
      this.todoForm.controls['description'].clearValidators();
      this.todoForm.updateValueAndValidity();
    }
  }

  dateToReadableFormat(date: Date) {
    const stringDate = date.toString();
    let newDate = stringDate.replace('-', '.').replace('-', '.').replace('T', ' ').slice(0, 16);
  
    return newDate;
  }

  findToDoById(id: number) :ToDo | undefined{
    return Object.values(this.groupedToDos).flat().find(x => x.id === id)
  }

  handleEventDrop(info: EventDropArg)
  {
    const todo = this.findToDoById(Number(info.event.id));
    if(todo === undefined || info.event.start === null) return;
    this.closeOtherOpenedToDo(todo);
    todo.modifiedAt = new Date();
    todo.deadline = info.event.start;

    this.todoService.updateTodo(todo).subscribe(response => {
      location.reload();
    });
  }

  onCalendarEventMouseEnter(info: EventHoveringArg)
  {
    this.currentlyHoveredToDo = this.findToDoById(Number(info.event._def.publicId));
  }

  onCalendarEventMouseLeave(info: EventHoveringArg)
  {
    this.currentlyHoveredToDo = undefined;
  }

  @HostListener('document:contextmenu', ['$event'])
  handleEventRightClick(event: MouseEvent){
    event.preventDefault();
    if(this.currentlyHoveredToDo !== undefined)
    {
      const container = document.getElementById("modal-container");
      if(container !== null)
      {
        this.currentlyClickedToDo = this.currentlyHoveredToDo;
        container.style.display = "block";
      }
    }
  }

  closeModal()
  {
    this.currentlyClickedToDo = undefined;
    this.currentlyHoveredToDo = undefined;
    const container = document.getElementById("modal-container");
    if(container !== null)
    {
      container.style.display = "none";
    }
  }

  
  isApplicableToFilterRules(todo: ToDo)
  {
    if(
      new Date(todo.createdAt) >= this.filterRules.filterAttribbutes.createdAtBeginning // A ToDo később lett létrehozva, mint a megadott intervallum kezdőértéke
      && new Date(todo.createdAt) <= this.filterRules.filterAttribbutes.createdAtEnding // de hamarabb, mint a megadott intervallum befejezett értéke
      && new Date(todo.modifiedAt) >= this.filterRules.filterAttribbutes.modifiedAtBeginning // A ToDo később lett (legutoljára) módosítva, mint a megadott intervallum kezdőértéke
      && new Date(todo.modifiedAt) <= this.filterRules.filterAttribbutes.modifiedAtEnding // de hamarabb, mint a megadott intervallum befejezett értéke
      && new Date(todo.deadline) >= this.filterRules.filterAttribbutes.deadlineBeginning // A ToDo határideje későbbi, mint a megadott intervallum kezdőértéke
      && new Date(todo.deadline) <= this.filterRules.filterAttribbutes.deadlineEnding // de hamarabb, mint a megadott intervallum befejezett értéke
      && todo.title.toLowerCase().includes(this.filterRules.searchAttribbutes.nameContains.toLowerCase()) // A ToDo neve tartalmazza a megadott szöveget
      && todo.description.toLowerCase().includes(this.filterRules.searchAttribbutes.descriptionContains.toLowerCase()) // A ToDo leírása tartalmazza a megadott szöveget
      && (
              (todo.priority == "Alacsony" && this.filterRules.filterAttribbutes.priorityLow) // Alacsony prioritású ToDo akkor legyen megjelenítve, ha engedélyezett
            || (todo.priority == "Normál" && this.filterRules.filterAttribbutes.priorityMid) // Normál prioritású ToDo akkor legyen megjelenítve, ha engedélyezett
            || (todo.priority == "Sürgős" && this.filterRules.filterAttribbutes.priorityHigh) // Magas prioritású ToDo akkor legyen megjelenítve, ha engedélyezett
      )
    )
    {
        return true;
    }

    return false;
  }

  currentlySortedBy = "";
  sortByAlphabet(whatToSortBy: string)
  {
    switch(whatToSortBy){
      case "title":
      case "description":
        if(this.currentlySortedBy !== "titleDESC" && this.currentlySortedBy !== "descriptionDESC")
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => a[whatToSortBy].localeCompare(b[whatToSortBy])));
          this.currentlySortedBy = whatToSortBy+"DESC";
        }
        else
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => b[whatToSortBy].localeCompare(a[whatToSortBy])));
          this.currentlySortedBy = whatToSortBy+"ASC";
        }
        break;

      case "createdAt":
      case "modifiedAt":
      case "deadline":
        if(this.currentlySortedBy !== "createdAtDESC" && this.currentlySortedBy !== "modifiedAtDESC" && this.currentlySortedBy !== "deadlineDESC")
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => new Date(a[whatToSortBy]).getTime() - new Date(b[whatToSortBy]).getTime()));
          this.currentlySortedBy = whatToSortBy+"DESC";
        }
        else
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => new Date(b[whatToSortBy]).getTime() - new Date(a[whatToSortBy]).getTime()));
          this.currentlySortedBy = whatToSortBy+"ASC";
        }
        break;
      case "priority":
        let priorityMap = {'Sürgős': 3, 'Normál': 2, 'Alacsony': 1};
        if(this.currentlySortedBy !== "priorityASC")
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]));
          this.currentlySortedBy = "priorityASC";
        }
        else
        {
          Object.values(this.groupedToDos).forEach(todos => todos.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]));
          this.currentlySortedBy = "priorityDESC";
        }
        break;
      default:
        alert("not found");
    }
  }


}
