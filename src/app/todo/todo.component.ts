import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ToDo } from '../models/todo.model';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.css']
})
export class TodoComponent implements OnInit{
  
  todo?: ToDo;
  isEdit = false;

  minDate = new Date(); // mai napi dátum. Nem lehet múltba létrehozni ToDot.
  maxDate = new Date(2040, 0, 1); // max dátum 2040 jan 1.
  
  todoForm: FormGroup = new FormGroup({
    title: new FormControl('', Validators.required),
    description: new FormControl('', Validators.required),
    status: new FormControl('Nincs elkezdve', Validators.required),
    priority: new FormControl('Normál', Validators.required),
    deadline: new FormControl('', Validators.required)
  });
  
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private todoService: TodoService
  ){};
    
  ngOnInit(): void {
  }

  onDelete(){};
  onSubmit(){};


}
