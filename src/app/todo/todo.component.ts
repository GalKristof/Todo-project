import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormControl } from '@angular/forms';

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
    deadline: new FormControl(this.getCurrentTime())
  });

  currentTodoForm: FormGroup = new FormGroup({
    currentTitle: new FormControl('', Validators.required),
    currentDescription: new FormControl('', Validators.required),
    currentStatus: new FormControl(''),
    currentPriority: new FormControl(''),
    currentDeadline: new FormControl('')
  }, {updateOn: 'blur'})

  groupedToDos: {[key: string]: ToDo[]} = {};
  lengthOfToDos = 0;
  currentOpenedToDo = 0;
  groupOfSelectedToDos: ToDo[] = [];
  
  constructor(
    private todoService: TodoService
  ){};
    
  ngOnInit(): void {
    this.todoService.getAllTodos().subscribe(todos => {
      this.groupedToDos = this.groupTodosByStatus(todos);
    });

    this.currentTodoForm.valueChanges.subscribe(selectedValue => {
      if(!this.currentTodoForm.dirty) return;
      const currentTodo = Object.values(this.groupedToDos).flat().find(x => x.id == this.currentOpenedToDo);
      if(currentTodo === undefined) return;
      console.log(currentTodo);
      return this.modifyToDo(currentTodo);
    })
  }

  groupTodosByStatus(todos: ToDo[]): ToDosByStatus {
    this.lengthOfToDos = todos.length;
    return todos.reduce((acc, curr) => {
    curr.expanded = false;
    if (!acc[curr.status]) {
    acc[curr.status] = [];
    }
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
      "createdAt": this.getCurrentTime(),
      "modifiedAt": this.getCurrentTime(),
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
      todo.modifiedAt = this.getCurrentTime();
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

  expandToDo(id: number)
  {
    let expandedToDo: ToDo;
    this.todoService.getTodo(id).subscribe(todo => {
      expandedToDo = todo;
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
    todo.modifiedAt = this.getCurrentTime();
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
    const openedToDo = Object.values(this.groupedToDos).flat().find(x => x.id === this.currentOpenedToDo);
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

  getCurrentTime()
  {
    // Pontos idő YYYY:MM:DD HH:MM formátummal
    const time = new Date();
    const year = time.getFullYear();
    const month = time.getMonth() + 1;
    const date = time.getDate();
    const hours = time.getHours();
    const minutes = time.getMinutes();

    const currentTime = new Date(`${year}-${month}-${date} ${hours}:${minutes}`);
    return currentTime;
  }


}
