import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

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
  
  todo?: ToDo;
  wantNewToDo = false;

  minDate = new Date(); // mai napi dátum. Nem lehet múltba létrehozni ToDot.
  maxDate = new Date(2040, 0, 1); // max dátum 2040 jan 1.
  
  todoForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl('Nincs elkezdve', Validators.required),
    priority: new FormControl('Alacsony', Validators.required),
    deadline: new FormControl(new Date(), Validators.required)
  });

  currentTodoForm: FormGroup = new FormGroup({
    currentTitle: new FormControl('asd', Validators.required),
    currentDescription: new FormControl('', Validators.required),
    currentStatus: new FormControl('', Validators.required),
    currentPriority: new FormControl('', Validators.required),
    currentDeadline: new FormControl('', Validators.required)
  })

  groupedToDos: {[key: string]: ToDo[]} = {};
  lengthOfToDos = 0;
  currentOpenedToDo = 0;
  
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private todoService: TodoService
  ){};
    
  ngOnInit(): void {
    this.todoService.getAllTodos().subscribe(todos => {
      this.groupedToDos = this.groupTodosByStatus(todos);
      this.lengthOfToDos = Object.values(this.groupedToDos).reduce((acc, val) => acc + val.length, 0);
      console.log(this.lengthOfToDos);
    });
  }

  groupTodosByStatus(todos: ToDo[]): ToDosByStatus {
    return todos.reduce((acc, curr) => {
    if (!acc[curr.status]) {
    acc[curr.status] = [];
    }
    acc[curr.status]?.push(curr);
    return acc;
    }, {} as ToDosByStatus);
  }

  onAdd(){
    const newTodo: ToDo = {
      "id": Math.random(),
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

  expandToDo(id: number)
  {
    let expandedToDo: ToDo;
    this.todoService.getTodo(id).subscribe(todo => {
      expandedToDo = todo;
      console.log(expandedToDo);
    })
  }

  modifyToDo(todo: ToDo)
  {
    todo.title = this.currentTodoForm.controls['currentTitle'].value;
    todo.description = this.currentTodoForm.controls['currentDescription'].value;
    todo.status = this.currentTodoForm.controls['currentStatus'].value;
    todo.priority = this.currentTodoForm.controls['currentPriority'].value;
    todo.deadline = this.currentTodoForm.controls['currentDeadline'].value;
    todo.modifiedAt = new Date();
    todo.expanded = false;
    this.currentOpenedToDo = 0;
    this.todoService.updateTodo(todo).subscribe(response => {
      location.reload();
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
  }


}
